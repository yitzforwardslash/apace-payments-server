const bcrypt = require('bcrypt');
const fs = require('fs');
const SendGrid = require('../../utils/SendGrid');
const {
  vendor: Vendor,
  vendorToken: VendorToken,
  customer: Customer,
  revenueShare: RevenueShare,
  vendorPaymentMethod: VendorPaymentMethod,
  vendorCard,
  globalSiteSetting: GlobalSiteSetting,
  vendorBankAccount: VendorBankAccount,
} = require('../../prisma/prismaClient');
const dbConnection = require('../../prisma/prismaClient');
const {
  CustomErrorHandler,
  NotUniqueError,
  NotFoundError,
} = require('../../utils/CustomError');
const {
  getRandomKey,
  getCustomersOrderBy,
  getCustomersSearch,
} = require('./vendor.utils');
const {
  calculateTotalPages,
  calculatenNextCursor,
} = require('../../utils/Pagination');
const Dwolla = require('../../utils/Dwolla');
const updateVendorStatus = require('../../message-broker/publishers/updateVendorStatus');
const logger = require('../../utils/Logger');
const VerificationFactory = require('../../utils/VerificationFactory');
const Encrypt = require('../../utils/Encrypt');
const { formatPhone } = require('../customer/customer.utils');
const { preparePagination } = require('../admin/admin.utils');
const { getQuickbookData } = require('../quckbooks/quickbooks.service');
const QuickBooks = require('../../utils/QuickBooks');
const {
  activateVendor,
} = require('../admin/dashboard/vendors/vendors.service');
const {
  getAgreementURL,
  generateAgreementFile,
} = require('./agreement/agreement.service');
const { AVERAGE_MONTHLY_OPTIONS } = require('../../utils/Constants');
const saltRounds = 15;

/**
 * Adds this vendor
 * @param {Object} vendorData
 * @param {String} vendorData.email
 * @param {String} vendorData.ownerFirstName
 * @param {String} vendorData.ownerLastName
 * @param {String} vendorData.commercialName
 * @param {String} vendorData.phone
 * @returns {Promise<Object>}
 */
module.exports.addNewVendor = async (vendorData) =>
  Vendor.create({
    data: {
      ...vendorData,
      refundListStatuses: ['pending', 'failed', 'processed'],
    },
  }).catch((error) => {
    if (CustomErrorHandler.isNotUniqueError(error)) {
      const notUniqueProperty = error.meta.target[0];
      throw new NotUniqueError(
        notUniqueProperty,
        vendorData[notUniqueProperty]
      );
    }
  });

/**
 * Adds this vendor
 * @param {Object} vendorData
 * @param {String} vendorData.email
 * @param {String} vendorData.ownerFirstName
 * @param {String} vendorData.ownerLastName
 * @param {String} vendorData.website
 * @param {String} vendorData.phone
 * @param {String} vendorData.password
 * @param {String} vendorData.country
 * @param {String} vendorData.ecommerce_platform
 * @param {String} vendorData.consent
 * @param {import('@prisma/client').AverageMonthlyRefundsEnum} vendorData.avg_monthly_refunds
 * @param {import('@prisma/client').IndustryEnum} vendorData.industry
 * @param {Boolean} vendorData.allow_notify
 * @param {Boolean} vendorData.allow_twostepverify
 * @returns {Promise<import('@prisma/client').Vendor>}
 */
module.exports.createVendor = async (vendorData) => {
  const hashedPassword = await bcrypt.hash(vendorData.password, saltRounds);
  try {
    const vendor = await Vendor.create({
      data: {
        ...vendorData,
        owner_firstname: vendorData.ownerFirstName,
        owner_lastname: vendorData.ownerLastName,
        owner_phone: vendorData.phone,
        refundListStatuses: ['pending', 'failed', 'processed'],
        password: hashedPassword,
      },
    });

    if (process.env.NODE_ENV === 'production') {
      await SendGrid.send({
        dynamicTemplateData: {
          vendor: vendor.commercialName,
          onboardingLink: process.env.APACE_VENDOR_ONBOARD_LINK,
        },
        from: {
          email: process.env.SENDING_EMAIL_VENDORS,
          name: 'Apace Payments',
        },
        templateId: process.env.SENDGRID_MERCHANT_WELCOME_TEMPLATE,
        to: vendor.email,
      });
    }

    if (process.env.NODE_ENV === 'development') {
      // activate vendor on sandbox
      try {
        await activateVendor(vendor.id);
        await Vendor.update({
          where: { id: vendor.id },
          data: { status: 'ACTIVE' },
        });
        console.log('ACTIVATED VENDOR', vendor.id);
      } catch (err) {
        console.log('ERROR ACTIVATING VENDOR', err);
      }
    }

    if (
      ['From100KTo500K', 'From500KTo1M', 'From1MAndUp'].includes(
        vendor.avg_monthly_refunds
      )
    ) {
      await this.notifyAdminsEnterpriseVendorSignup(vendor.id);
    }

    return vendor;
  } catch (error) {
    if (CustomErrorHandler.isNotUniqueError(error)) {
      const notUniqueProperty = error.meta.target[0];
      throw new NotUniqueError(
        notUniqueProperty,
        vendorData[notUniqueProperty]
      );
    }
  }
};

module.exports.notifyAdminsEnterpriseVendorSignup = async (vendorId) => {
  const vendor = await Vendor.findUnique({ where: { id: vendorId } });
  const notificationEmails = await GlobalSiteSetting.findUnique({
    where: { key: 'enterprise_notification_emails' },
  });

  if (notificationEmails && notificationEmails.value) {
    const adminEmails = notificationEmails.value
      .split(',')
      .map((email) => email.trim());
    try {
      console.log('Noitfying emails for enterprise signup', adminEmails);
      const avgMonthly = AVERAGE_MONTHLY_OPTIONS.find(
        (item) => item.value === vendor.avg_monthly_refunds
      );
      await Promise.all(
        adminEmails.map(async (email) => {
          await SendGrid.send({
            dynamicTemplateData: {
              merchantName: vendor.commercialName,
              merchantEmail: vendor.email,
              merchantWebsite: vendor.website || '-',
              avg_monthly_refunds: avgMonthly ? avgMonthly.title : '-',
              industry: vendor.industry || '-',
              ecommerce_platform: vendor.ecommerce_platform || '-',
              environment:
                process.env.NODE_ENV === 'production'
                  ? 'Production'
                  : 'Sandbox',
              actionURL: `${process.env.APACE_ADMIN_MERCHANT_URL}/${vendor.id}`,
            },
            from: {
              email: process.env.SENDING_EMAIL_VENDORS,
              name: 'Apace Payments',
            },
            templateId:
              process.env.SENDGRID_ADMIN_ENTERPRISE_MERCHANT_SIGNED_UP,
            to: email,
          });
        })
      );
    } catch (err) {
      console.log(err);
    }
  }
};

module.exports.updateVendorOnboard = async (vendorId, data) => {
  const { owner_ssn, owner_phone, ...rest } = data;

  const update = { ...rest };
  if (update.commercialName) {
    const existingCommercial = await Vendor.findFirst({
      where: {
        commercialName: rest.commercialName,
        id: { not: { equals: vendorId } },
      },
    });
    if (existingCommercial) {
      throw new Error('Commercial name is already in use');
    }
  }
  if (owner_ssn) {
    update.owner_ssn = Encrypt.encrypt(owner_ssn);
  }
  if (owner_phone) {
    update.owner_phone = formatPhone(owner_phone);
  }

  await Vendor.update({ where: { id: vendorId }, data: update });

  const vendor = await Vendor.findUnique({ where: { id: vendorId } });

  if (vendor.quickbooksId) {
    const quickbooksData = await getQuickbookData();
    try {
      const quickbooksResponse = await QuickBooks.updateCustomer(
        JSON.parse(quickbooksData.token),
        quickbooksData.realmId,
        vendor.quickbooksId,
        vendor.quickbooksSyncToken,
        {
          DisplayName: `${vendor.commercialName} - ${vendor.owner_firstname} ${vendor.owner_lastname}`,
          CompanyName: vendor.commercialName,
          GivenName: vendor.owner_firstname,
          FamilyName: vendor.owner_lastname,
          PrimaryEmailAddr: {
            Address: vendor.email,
          },
          PrimaryPhone: {
            FreeFormNumber: vendor.phone,
          },
          BillAddr: {
            City: vendor.city,
            PostalCode: vendor.zip,
            CountrySubDivisionCode: vendor.state,
            Country: vendor.country,
            Line1: vendor.street_1,
          },
        }
      );

      await Vendor.update({
        where: { id: vendorId },
        data: { quickbooksSyncToken: quickbooksResponse.SyncToken },
      });
    } catch (err) {
      console.dir(err.response.data, { depth: null });
    }
  }

  return true;
};

module.exports.submitForReview = async (vendorId, agreementDate) => {
  const vendor = await Vendor.findUnique({ where: { id: vendorId } });

  const agreementUrl = await getAgreementURL(
    {
      ownerFirstName: vendor.owner_firstname,
      ownerLastName: vendor.owner_lastname,
      commercialName: vendor.commercialName,
      entity: vendor.entity,
      state: vendor.state,
      address: vendor.street_1,
      city: vendor.city,
      zip: vendor.zip,
    },
    new Date(agreementDate),
    true
  );

  const agreementFilePath = await generateAgreementFile(
    {
      ownerFirstName: vendor.owner_firstname,
      ownerLastName: vendor.owner_lastname,
      commercialName: vendor.commercialName,
      entity: vendor.entity,
      state: vendor.state,
      address: vendor.street_1,
      city: vendor.city,
      zip: vendor.zip,
    },
    new Date(agreementDate),
    true
  );

  await Vendor.update({
    where: { id: vendorId },
    data: {
      status: 'SUBMITTED',
      agreementDate: new Date(agreementDate),
      agreementSigned: true,
      agreementUrl,
    },
  });

  const agreementAttachment = fs
    .readFileSync(agreementFilePath)
    .toString('base64');
  await SendGrid.send({
    dynamicTemplateData: {
      vendor: vendor.commercialName,
    },
    from: {
      email: process.env.SENDING_EMAIL_VENDORS,
      name: 'Apace Payments',
    },
    templateId: process.env.SENDGRID_MERCHANT_SUBMITTED_TEMPLATE,
    to: vendor.email,
    attachments: [
      {
        content: agreementAttachment,
        filename: 'Agreement.pdf',
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  });

  fs.unlink(agreementFilePath, () => {});

  return true;
};

/**
 * @param {String} identifier
 * @param {String} password
 * @returns {Promise<[boolean, number]>}
 */
module.exports.tryToLogin = async (identifier, password, isAdmin) => {
  const query = {};
  if (identifier.includes('@')) {
    query.email = identifier;
  } else {
    query.phone = identifier;
  }
  const vendor = await Vendor.findUnique({ where: query });
  if (!vendor) {
    return [false, null];
  }
  const passwordMatches =
    isAdmin || (await bcrypt.compare(password, vendor.password));
  if (!passwordMatches) {
    return [false, null];
  }
  if (process.env.NODE_ENV === 'development') {
    return [true, null];
  }
  if (vendor.allow_twostepverify) {
    const verificationMethod = VerificationFactory(identifier, 'vendor');
    const { code } = await verificationMethod.sendCode();
    return [true, code];
  }
  return [true, null];
};

module.exports.getVendorByRefundId = async (refundId) => {
  const vendor = await Vendor.findFirst({
    where: { refunds: { some: { id: refundId } } },
  });

  return vendor;
};

module.exports.getVendor = async ({ identifier, id }) => {
  const query = {};
  if (!identifier) {
    query.id = id;
  } else if (identifier.includes('@')) {
    query.email = identifier;
  } else {
    query.phone = identifier;
  }
  return Vendor.findUnique({ where: query });
};

/**
 * @param {String} vendorId
 * @param {String} apiPublicId
 * @param {String} apiSecret
 * @returns {Promise<Boolean>}
 */
module.exports.validateVendorToken = async (
  vendorId,
  apiPublicId,
  apiSecret
) => {
  const vendor = await Vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    return;
  }
  const vendorToken = await VendorToken.findUnique({
    where: { publicId: apiPublicId },
  });
  if (!vendorToken || vendorToken.vendorId !== vendorId) {
    return;
  }
  const isValidApiKey = await bcrypt.compare(apiSecret, vendorToken.secret);
  if (isValidApiKey) {
    await VendorToken.update({
      where: { publicId: apiPublicId },
      data: { lastUsedAt: new Date() },
    });
    return isValidApiKey;
  }
};

/**
 * It creates a vendor public id, api key, api key
 * It ensures that the public id is unique, and this is the only function
 * that is allowed tto return the apiKey directly to the caller
 * @param {String} vendorId
 * @param {String} keyName
 * @returns {Object}
 */
module.exports.addVendorTokens = async (vendorId, keyName) => {
  let publicId;
  let isPublicIdUnique = false;
  while (!isPublicIdUnique) {
    publicId = await getRandomKey(256);
    isPublicIdUnique = await VendorToken.findUnique({
      where: { publicId },
    }).then((token) => !token);
  }
  const apiKey = await getRandomKey(256);
  const hashedApiKey = await bcrypt.hash(apiKey, saltRounds);
  const createdVendorToken = await VendorToken.create({
    data: {
      publicId,
      vendorId,
      secret: hashedApiKey,
      name: keyName,
    },
  });
  return createdVendorToken
    ? {
        publicId,
        apiKey,
        vendorId,
        keyName,
      }
    : null;
};

/**
 * @param {String} vendorId
 * @returns {Promise<Array>}
 */
module.exports.getVendorKeys = async (vendorId) =>
  VendorToken.findMany({
    where: { vendorId },
    select: {
      publicId: true,
      createdAt: true,
      lastUsedAt: true,
      name: true,
    },
  });

module.exports.getSecretVendorId = async (publicId, secret) => {
  const vendorToken = await VendorToken.findUnique({
    where: { publicId },
    select: { vendorId: true, secret: true },
  });

  const isValid =
    vendorToken && (await bcrypt.compare(secret, vendorToken.secret));
  return isValid ? vendorToken.vendorId : false;
};

module.exports.getKeyVendorId = async (publicId) =>
  VendorToken.findUnique({
    where: { publicId },
    select: { vendorId: true },
  }).then((key) => (key ? key.vendorId : null));

/**
 * @param {Number} publicId
 * @param {String} vendorId
 * @returns {Promise<Boolean>}
 */
module.exports.deleteVendorKey = async (publicId, vendorId) =>
  VendorToken.deleteMany({ where: { publicId, vendorId } }).then(
    ({ count }) => count === 1
  );

module.exports.getVendorCustomersStats = async (vendorId) => {
  const [enabledCount, disabledCount] = await Promise.all([
    Customer.count({
      where: {
        AND: [
          {
            refunds: { some: { vendorId } },
          },
          {
            disabledFromVendors: { none: { id: vendorId } },
          },
        ],
      },
    }),
    Customer.count({
      where: {
        AND: [
          {
            refunds: { some: { vendorId } },
          },
          {
            disabledFromVendors: { some: { id: vendorId } },
          },
        ],
      },
    }),
  ]);

  return {
    enabledCount,
    disabledCount,
  };
};

/**
 * @param {String} vendorId
 * @param {Number} cursor
 * @param {Number} pageLength
 * @returns {Promise}
 */
module.exports.getVendorCustomers = async (
  vendorId,
  cursor,
  pageLength,
  options = {}
) => {
  if (!pageLength) {
    pageLength = 10;
  }
  if (cursor === 0) {
    cursor = 1;
  }
  const selectCustomerQuery = {
    take: pageLength,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      refunds: true,
      disabledFromVendors: { select: { id: true } },
    },
  };
  if (cursor) {
    selectCustomerQuery.skip = (cursor - 1) * pageLength;
  }
  const whereData = {
    AND: [{ refunds: { some: { vendorId } } }],
  };

  if (options.orderBy) {
    selectCustomerQuery.orderBy = getCustomersOrderBy(
      options.orderBy,
      options.orderDirection
    );
  }
  if (options.search) {
    whereData.AND.push(getCustomersSearch(options.search));
  }

  const [totalCount, customers] = await Promise.all([
    Customer.count({
      where: whereData,
    }),
    Customer.findMany({
      where: whereData,
      ...selectCustomerQuery,
    }),
  ]);
  customers.forEach((customer) => {
    if (
      customer.disabledFromVendors &&
      customer.disabledFromVendors.findIndex(
        (vendor) => vendor.id === vendorId
      ) !== -1
    ) {
      customer.status = 'disabled';
    } else {
      customer.status = 'enabled';
    }
    Reflect.deleteProperty(customer, 'disabledFromVendors');
  });
  return {
    totalCount,
    customers,
    totalPages: calculateTotalPages(totalCount, pageLength),
    nextCursor: cursor + 1,
  };
};

/**
 *
 * @param {String} vendorId
 * @param {String} customerIdentifier
 * @returns {Promise<Boolean>}
 */
module.exports.isCustomerDisabled = (vendorId, customerIdentifier) =>
  Vendor.findUnique({
    where: { id: vendorId },
    select: { disabledCustomers: { select: { email: true, phone: true } } },
  }).then(
    (vendor) =>
      vendor.disabledCustomers.findIndex(
        (customer) =>
          customer.email === customerIdentifier ||
          customer.phone === customerIdentifier
      ) !== -1
  );

/**
 *
 * @param {String} vendorId
 * @returns {Promise<Array>}
 */
module.exports.getEnabledCustomers = async (
  vendorId,
  cursor,
  pageLength,
  options = {}
) => {
  if (!pageLength) {
    pageLength = 10;
  }
  if (cursor === 0) {
    cursor = 1;
  }
  const selectCustomerQuery = {
    take: pageLength,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  };
  if (cursor) {
    selectCustomerQuery.skip = (cursor - 1) * pageLength;
  }

  const whereData = {
    AND: [
      {
        refunds: { some: { vendorId } },
      },
      {
        disabledFromVendors: { none: { id: vendorId } },
      },
    ],
  };

  if (options.orderBy) {
    selectCustomerQuery.orderBy = getCustomersOrderBy(
      options.orderBy,
      options.orderDirection
    );
  }
  if (options.search) {
    whereData.AND.push(getCustomersSearch(options.search));
  }

  const [totalCount, customers] = await Promise.all([
    Customer.count({
      where: whereData,
    }),
    Customer.findMany({
      where: whereData,
      ...selectCustomerQuery,
    }),
  ]);
  customers.forEach((customer) => {
    customer.status = 'enabled';
  });

  return {
    totalCount,
    customers,
    totalPages: calculateTotalPages(totalCount, pageLength),
  };
};

/**
 *
 * @param {String} vendorId
 * @returns {Promise<Array>}
 */
module.exports.getDisabledCustomers = async (
  vendorId,
  cursor,
  pageLength,
  options = {}
) => {
  if (!pageLength) {
    pageLength = 10;
  }
  if (cursor === 0) {
    cursor = 1;
  }
  const selectCustomerQuery = {
    take: pageLength,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  };
  if (cursor) {
    selectCustomerQuery.skip = (cursor - 1) * pageLength;
  }

  const whereData = {
    AND: [
      {
        refunds: { some: { vendorId } },
      },
      {
        disabledFromVendors: { some: { id: vendorId } },
      },
    ],
  };

  if (options.orderBy) {
    selectCustomerQuery.orderBy = getCustomersOrderBy(
      options.orderBy,
      options.orderDirection
    );
  }
  if (options.search) {
    whereData.AND.push(getCustomersSearch(options.search));
  }

  const [totalCount, customers] = await Promise.all([
    Customer.count({
      where: whereData,
    }),
    Customer.findMany({
      where: whereData,
      ...selectCustomerQuery,
    }),
  ]);

  customers.forEach((customer) => {
    customer.status = 'disabled';
  });
  return {
    totalCount,
    customers,
    totalPages: calculateTotalPages(totalCount, pageLength),
  };
};

/**
 * @param {String} vendorId
 * @param {Array<Number>} customersToBeDisabled
 * @returns {Promise<Prisma.VendorDelegate<false>>}
 */
module.exports.addDisabledCustomers = async (
  vendorId,
  customersToBeDisabled
) => {
  const customersInDb = await Customer.findMany({
    where: {
      id: {
        in: customersToBeDisabled,
      },
    },
  });
  if (customersInDb.length === 0) {
    throw new Error('Invalid customer id');
  }

  return Vendor.update({
    where: { id: vendorId },
    data: {
      disabledCustomers: {
        connect: customersInDb.map(({ id }) => ({
          id,
        })),
      },
    },
  });
};

/**
 * @param {String} vendorId
 * @param {Array<Number>} customerToBeRemoved
 */
module.exports.removeDisabledCustomers = async (
  vendorId,
  customerToBeRemoved
) => {
  const customersInDb = await Customer.findMany({
    where: {
      id: {
        in: customerToBeRemoved,
      },
    },
  });
  if (customersInDb.length === 0) {
    throw new Error('Invalid customer id');
  }
  Vendor.update({
    where: { id: vendorId },
    data: {
      disabledCustomers: {
        disconnect: customerToBeRemoved.map((customerId) => ({
          id: customerId,
        })),
      },
    },
  });
};

/**
 * @param {String} receiver
 * @returns {Promise<Boolean>}
 */
module.exports.sendForgotCode = async (receiver) => {
  try {
    const verificationMethod = VerificationFactory(receiver, 'vendor');
    await verificationMethod.sendCode();
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
};

/**
 * @param {String} identifier
 * @param {String} password
 * @returns {Promise<Boolean>}
 */
module.exports.changePassword = async (identifier, password) => {
  const query = {};
  if (identifier.includes('@')) {
    query.email = identifier;
  } else {
    query.phone = identifier;
  }
  const currentPassword = (
    await Vendor.findUnique({
      where: query,
      select: { password: true },
    })
  ).password;
  const passwordAlreadyUsed = await bcrypt.compare(password, currentPassword);
  if (passwordAlreadyUsed) {
    return false;
  }
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return Vendor.update({
    where: query,
    data: { password: hashedPassword },
  }).then((updatedDocument) => Boolean(updatedDocument));
};

module.exports.getAllVendors = () =>
  Vendor.findMany({ select: { id: true } }).then((vendors) =>
    vendors.map((vendor) => vendor.id)
  );

module.exports.updateVendorLogo = (vendorId, logoUrl) =>
  Vendor.update({ where: { id: vendorId }, data: { logoUrl } });

/**
 * @param {String} vendorId
 * @param {Object} vendorData
 * @returns {Promise<Object>}
 */
module.exports.updateVendor = async (vendorId, vendorData) => {
  const vendor = await Vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new NotFoundError('vendor');
  }
  return Vendor.update({
    where: { id: vendorId },
    data: {
      email: vendorData.email || vendor.email,
      phone: vendorData.phone || vendor.phone,
      ownerFirstName: vendorData.ownerFirstName || vendor.ownerFirstName,
      ownerLastName: vendorData.ownerLastName || vendor.ownerLastName,
      commercialName: vendorData.commercialName || vendor.commercialName,
      profilePictureUrl:
        vendorData.profilePictureUrl || vendor.profilePictureUrl,
      allow_twostepverify: !!vendorData.allow_twostepverify,
    },
    select: {
      id: true,
      ownerFirstName: true,
      ownerLastName: true,
      commercialName: true,
      email: true,
      phone: true,
      profilePictureUrl: true,
      allow_twostepverify: true,
    },
  }).catch((error) => {
    if (CustomErrorHandler.isNotUniqueError(error)) {
      const notUniqueProperty = error.meta.target[0];
      throw new NotUniqueError(
        notUniqueProperty,
        vendorData[notUniqueProperty]
      );
    }
    throw error;
  });
};

module.exports.getAllProfilePictures = () =>
  Vendor.findMany({
    where: { profilePictureUrl: { not: null } },
    select: { profilePictureUrl: true },
  }).then((vendors) => vendors.map((vendor) => vendor.profilePictureUrl));

/**
 * @param {String} vendorId
 * @param {String} filter
 * @returns {Promise}
 */
module.exports.getPaymentMethods = (vendorId, filter) =>
  Vendor.findUnique({
    where: { id: vendorId },
    select: { email: true, defaultFundingSource: true },
  }).then(async (vendor) => {
    let bankAccounts = [],
      cards = [];
    if (!filter) {
      [bankAccounts, cards] = await Promise.all([
        Dwolla.getDwollaCustomerBankAccounts(vendor.email),
        Dwolla.getDwollaCustomerCards(vendor.email),
      ]);
    } else if (filter === 'bank') {
      bankAccounts = await Dwolla.getDwollaCustomerBankAccounts(vendor.email);
    } else {
      cards = await Dwolla.getDwollaCustomerCards(vendor.email);
    }
    if (vendor.defaultFundingSource) {
      bankAccounts.forEach((account) => {
        if (account.fundingSourceLink === vendor.defaultFundingSource) {
          account.defaultPaymentMethod = true;
        }
      });
      cards.forEach((card) => {
        if (card.fundingSourceLink === vendor.defaultFundingSource) {
          card.defaultPaymentMethod = true;
        }
      });
    }
    return { bankAccounts, cards };
  });

// Still needs to keep sure request is coming from the owner of this funding source
module.exports.deleteVendorPaymentMethod = (vendorId, fundingSource) =>
  Dwolla.deleteFundingSource(fundingSource).then(() =>
    updateVendorStatus(vendorId)
  );

module.exports.addDefaultFundingSource = (vendorId, fundingSource) =>
  Vendor.update({
    where: { id: vendorId },
    data: { status: 'ACTIVE', defaultFundingSource: fundingSource },
  });

module.exports.updateVendorStatus = async (vendorId) => {
  const [paymentMethods, vendor] = await Promise.all([
    this.getPaymentMethods(vendorId),
    Vendor.findUnique({
      where: { id: vendorId },
      select: { defaultFundingSource: true },
    }),
  ]);
  const disabled = !hasActivePaymentMethod(cards, bankAccounts);
  if (!disabled && !vendor.defaultFundingSource) {
    const defaultFundingSource = getDefaultPaymentMethod(paymentMethods);
    await this.addDefaultFundingSource(vendorId, defaultFundingSource);
  } else {
  }
};

const getDefaultPaymentMethod = ({ cards, bankAccounts }) => {
  if (cards.length) {
    return cards[0].fundingSourceLink;
  } else {
    return bankAccounts[0].fundingSourceLink;
  }
};

const hasActivePaymentMethod = async ({ cards, bankAccounts }) => {
  return cards.length || bankAccounts.length;
};

/**
 * @param {String} refundId
 * @returns {Promise<Boolean>}
 */
module.exports.isVendorDisabled = (refundId) =>
  Vendor.findFirst({
    where: { refunds: { some: { id: refundId } } },
    select: { status: true },
  }).then((vendor) => (vendor ? vendor.status !== 'ACTIVE' : null));

const STATS_SELECTIONS = {
  amount: `sum("amount") as amount`,
  customers: `count(DISTINCT "customerId") as customers`,
  invoices: `count("invoiceId") as invoices`,
  refunds: `count("id") as refunds`,
};

Object.freeze(STATS_SELECTIONS);
/**
 * @param {Object} queryObject
 * @param {Date} queryObject.startDate
 * @param {Date} queryObject.endDate
 * @param {Number} queryObject.vendorId
 * @param {String} queryObject.groupBy
 * @param {Array<String>} queryObject.selections
 */
module.exports.getVendorStats = async ({
  vendorId,
  startDate,
  endDate,
  groupBy,
  selections,
}) => {
  const selectionArray = selections.map(
    (selection) => STATS_SELECTIONS[selection]
  );
  const selectionString = selectionArray.length
    ? selectionArray.join(',')
    : Object.values(STATS_SELECTIONS).join(',');
  const queryResult = await dbConnection.$queryRaw(
    `SELECT date_trunc('${groupBy}', "refundDate") as date, ${selectionString}
     FROM "public"."Refund"
     WHERE status = 'processed'
     AND "refundDate" BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
     GROUP BY "vendorId", date
     HAVING "vendorId" = '${vendorId}'`
  );

  return queryResult;
};

module.exports.vendorOwnsPaymentMethod = async (vendorId, fundingSource) => {
  const [{ email: fundingOwnerEmail }, { email: vendorEmail }] =
    await Promise.all([
      Dwolla.getFundingSourceOwner(fundingSource),
      Vendor.findUnique({ where: { id: vendorId }, select: { email: true } }),
    ]);
  if (!fundingOwnerEmail || !vendorEmail) {
    return false;
  }
  return fundingOwnerEmail.toLowerCase() === vendorEmail.toLocaleLowerCase();
};

module.exports.getVendorBankAccounts = (vendorId) =>
  VendorBankAccount.findMany({
    where: {
      vendorId,
    },
    select: {
      id: true,
      name: true,
      routingNumberLastFour: true,
      accountNumberLastFour: true,
    },
  });

module.exports.getVendorPaymentMethods = (vendorId) =>
  VendorPaymentMethod.findMany({
    where: {
      vendorId,
    },
    include: {
      vendorCard: {
        select: {
          id: true,
          fullName: true,
          lastFour: true,
          network: true,
          expirationDate: true,
          expirationDateEncrypted: true,
        },
      },
      vendorBankAccount: {
        select: {
          id: true,
          name: true,
          routingNumberLastFour: true,
          accountNumberLastFour: true,
        },
      },
    },
  });

module.exports.isVendorBankAccount = async (vendorId, bankAccountId) => {
  const bankAccount = await VendorBankAccount.findFirst({
    where: { id: bankAccountId, vendorId },
  });

  return !!bankAccount;
};

module.exports.getVendorCards = (vendorId) =>
  vendorCard.findMany({
    where: {
      vendorId,
    },
    select: {
      id: true,
      fullName: true,
      lastFour: true,
      network: true,
      expirationDate: true,
      expirationDateEncrypted: true,
    },
  });

module.exports.isVendorCard = async (vendorId, cardId) => {
  const card = await vendorCard.findFirst({ where: { id: cardId, vendorId } });

  return !!card;
};

module.exports.getVendorRevenueShares = async (
  vendorId,
  cursor,
  pageLength,
  page
) => {
  const where = { vendorId, amount: { gt: 0 } };

  const totalCount = await RevenueShare.count({ where });

  const paginationData = preparePagination(
    cursor,
    pageLength,
    totalCount,
    page
  );

  const revenueShares = await RevenueShare.findMany({
    ...paginationData.pagination,
    where,
    include: {
      refund: {
        select: {
          id: true,
          refundNumber: true,
          amount: true,
          refundDepositedAt: true,
          invoice: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });

  return {
    revenueShares,
    totalCount,
    totalPages: paginationData.totalPages,
    nextCursor: calculatenNextCursor(revenueShares),
    currentPage: Number.parseInt(page),
  };
};

module.exports.getVendorAvailableRevenueShare = async (vendorId) => {
  return await Vendor.findUnique({
    where: { id: vendorId },
    select: {
      availableRevenueShareAmount: true,
    },
  });
};

module.exports.updateLastInvoicedAt = (vendorId, lastInvoicedAt) =>
  Vendor.update({ where: { id: vendorId }, data: { lastInvoicedAt } });

module.exports.updateAllowAutopay = (vendorId, allow_autopay) =>
  Vendor.update({ where: { id: vendorId }, data: { allow_autopay } });

module.exports.updateRevenueShareEnabled = (vendorId, revenueShareEnabled) =>
  Vendor.update({ where: { id: vendorId }, data: { revenueShareEnabled } });

module.exports.updateSetupEnabled = (vendorId, setupEnabled) =>
  Vendor.update({ where: { id: vendorId }, data: { setupEnabled } });
