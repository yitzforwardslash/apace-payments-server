const {
  vendor: Vendor,
  refund: Refund,
  invoice: Invoice,
} = require('../../../../prisma/prismaClient');
const { NotFoundError } = require('../../../../utils/CustomError');
const SendGrid = require('../../../../utils/SendGrid');
const {
  retrieveOverdueInvoicesTotalAmount,
  retrievePaidInvoicesTotalAmount,
  retrieveDueInvoicesTotalAmount,
} = require('../invoices/invoices.service');
const { retrieveRefundsTotalAmount } = require('../refunds/refunds.service');
const { getDateRangeFilter, preparePagination } = require('../../admin.utils');
const { calculatenNextCursor } = require('../../../../utils/Pagination');
const { logInfo, logError } = require('../../logs/logs.service');
const AptPay = require('../../../../utils/AptPay');
const { formatPhone } = require('../../../customer/customer.utils');
const QuickBooks = require('../../../../utils/QuickBooks');
const { getQuickbookData } = require('../../../quckbooks/quickbooks.service');
const Stripe = require('../../../../utils/Stripe');
const {
  getInvoicesFilterByTypeAndDates,
} = require('../invoices/invoices.utils');
const Encrypt = require('../../../../utils/Encrypt');

const retrieveVendors = async (cursor, pageLength, page, status) => {
  const whereData = status ? { status: status.toUpperCase() } : {};

  const totalCount = await Vendor.count({
    where: whereData,
  });

  const paginationData = preparePagination(
    cursor,
    pageLength,
    totalCount,
    page
  );

  const vendors = await Vendor.findMany({
    ...paginationData.pagination,
    where: whereData,
    select: {
      id: true,
      email: true,
      ownerFirstName: true,
      ownerLastName: true,
      createdAt: true,
      status: true,
    },
  });

  if (vendors) {
    await Promise.all(
      vendors.map(async (vendor) => {
        vendor.dueAmount = await retrieveDueInvoicesTotalAmount(vendor.id);
        vendor.overdueAmount = await retrieveOverdueInvoicesTotalAmount(
          vendor.id
        );
      })
    );
  }

  return {
    vendors,
    totalCount,
    totalPages: paginationData.totalPages,
    nextCursor: calculatenNextCursor(vendors),
    currentPage: Number.parseInt(page),
  };
};

const retrieveVendorsCount = async () => {
  return await Vendor.groupBy({
    by: ['status'],
    _count: true,
  });
};

const retrieveVendorById = async (vendorId) => {
  const vendor = await Vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    throw new NotFoundError('Vendor');
  }

  return vendor;
};

/* vendor refunds*/
const retrieveVendorRefunds = async (
  id,
  dates,
  statuses,
  cursor,
  pageLength,
  page
) => {
  if (!statuses) {
    statuses = ['pending', 'processed', 'failed'];
  }

  const whereData = {
    vendorId: id,
    ...getDateRangeFilter(dates, 'refundDate'),
    status: { in: statuses },
  };

  const totalCount = await Refund.count({ where: whereData });

  const totalAmount = await retrieveRefundsTotalAmount(dates, id, statuses);

  const paginationData = preparePagination(
    cursor,
    pageLength,
    totalCount,
    page
  );

  const selectData = {
    id: true,
    amount: true,
    refundDepositedAt: true,
    refundDate: true,
    revenueShare: true,
    status: true,
  };

  const refunds = await Refund.findMany({
    ...paginationData.pagination,
    select: selectData,
    where: whereData,
  });

  return {
    refunds,
    totalAmount,
    totalCount,
    totalPages: paginationData.totalPages,
    nextCursor: calculatenNextCursor(refunds),
    currentPage: Number.parseInt(page),
  };
};

/* vendor invoices */
const retrieveVendorInvoices = async (
  id,
  cursor,
  pageLength,
  page,
  whereData,
  orderData
) => {
  const totalCount = await Invoice.count({ where: whereData });

  const paginationData = preparePagination(
    cursor,
    pageLength,
    totalCount,
    page
  );

  const orderObject = {};

  if (orderData.orderBy)
    orderObject[orderData.orderBy] = orderData.order ?? 'desc';

  console.log({ orderObject });

  const invoices = await Invoice.findMany({
    ...paginationData.pagination,
    where: whereData,
    orderBy: orderObject,
    include: {
      refunds: true,
    },
  });

  return {
    invoices,
    dueAmount: await retrieveDueInvoicesTotalAmount(id),
    overdueAmount: await retrieveOverdueInvoicesTotalAmount(id),
    paidAmount: await retrievePaidInvoicesTotalAmount({}, id),
    totalCount,
    totalPages: paginationData.totalPages,
    nextCursor: calculatenNextCursor(invoices),
    currentPage: Number.parseInt(page),
  };
};

const retrieveVendorInvoicesStats = async (vendorId) => {
  const invoiceTypes = ['paid', 'unpaid', 'due', 'dueToday', 'overdue'];

  const whereData = { vendorId };

  const invoicesCount = { all: await Invoice.count({ where: whereData }) };

  await Promise.all(
    invoiceTypes.map(async (type) => {
      invoicesCount[type] = await Invoice.count({
        where: { ...whereData, ...getInvoicesFilterByTypeAndDates(type) },
      });
    })
  );

  return { invoicesCount };
};

const alterVendorStatus = async (id, status, updatedBy) => {
  const vendor = await Vendor.findUnique({ where: { id } });

  if (!vendor) {
    await logError({
      action: 'update',
      model: 'vendor',
      description: 'Vendor not found',
      actionOn: id.toString(),
      updatedBy,
    });
    throw new NotFoundError('vendor');
  }

  await validateStatusUpdate(id, vendor, status, updatedBy);

  try {
    const vendorUpdate = {
      status,
    };

    if (status === 'ACTIVE') {
      await activateVendor(id);
    }

    const updatedVendor = await Vendor.update({
      where: { id },
      data: vendorUpdate,
    });

    if (status === 'DISABLED') {
      await SendGrid.send({
        dynamicTemplateData: {
          vendor: vendor.commercialName,
        },
        from: {
          email: process.env.SENDING_EMAIL_VENDORS,
          name: 'Apace Payments',
        },
        templateId: process.env.SENDGRID_MERCHANT_REJECTED_TEMPLATE,
        to: vendor.email,
      });
    }

    await logInfo({
      action: 'update',
      model: 'vendor',
      actionOn: id.toString(),
      updatedBy,
      oldValues: { status: vendor.status },
      newValues: vendorUpdate,
      updatedFields: Object.keys(vendorUpdate),
      description: 'Change Vendor Status',
    });

    return updatedVendor;
  } catch (error) {
    console.log({ error });
    await logError({
      action: 'update',
      model: 'vendor',
      description: JSON.stringify(error),
      actionOn: id.toString(),
      updatedBy,
    });
    throw new Error('Error while updating vendor.');
  }
};

const activateVendor = async (id) => {
  const vendor = await Vendor.findUnique({ where: { id } });
  if (!vendor.aptpayId &&  vendor.ownerFirstName && vendor.owner_dob && vendor.dateOfIncorporation) {
    const aptpayId = await createAptPayPayeeForVendor(vendor);
    await Vendor.update({ where: { id }, data: { aptpayId } });
  }
  if (!vendor.quickbooksId) {
    const quickbooksData = await createQuickbooksCustomerForVendor(vendor);

    if (quickbooksData) {
      await Vendor.update({
        where: { id },
        data: {
          quickbooksId: quickbooksData.id,
          quickbooksSyncToken: quickbooksData.syncToken,
        },
      });
    }
  }
  if (!vendor.stripeId && vendor.owner_dob) {
    const stripeCustomerId = await createStripeCustomerForVendor(vendor);

    await Vendor.update({
      where: { id },
      data: { stripeId: stripeCustomerId },
    });
  }
};

const createAptPayPayeeForVendor = async (vendor) => {
  const dobParts = vendor.owner_dob.split('/');
  const doiParts = vendor.dateOfIncorporation.split('/');

  const aptPayPayee = await AptPay.createPayee({
    idividual: false,
    name: vendor.commercialName,
    province: vendor.state,
    countryOfRegistration: 'US',
    provinceOfRegistration: 'US',
    businessTaxId: vendor.ein,
    dbaName: vendor.dbaName || vendor.commercialName,
    url: vendor.website,
    typeOfBusiness: vendor.entity,
    dateOfIncorporation: `${doiParts[2]}-${doiParts[0]}-${doiParts[1]}`,
    first_name: vendor.ownerFirstName || vendor.owner_firstname,
    last_name: vendor.ownerLastName || vendor.owner_lastname,
    phone: formatPhone(vendor.owner_phone),
    email: vendor.email,
    city: vendor.city,
    country: 'US',
    dateOfBirth: `${dobParts[2]}-${dobParts[0]}-${dobParts[1]}`,
    nationalIdentityNumber: Encrypt.decrypt(vendor.owner_ssn),
    street: vendor.street_1,
    street_line_2: vendor.street_2,
    zip: vendor.zip,
    clientId: vendor.id,
  });

  return aptPayPayee.id.toString();
};

const createQuickbooksCustomerForVendor = async (vendor) => {
  const quickbooksData = await getQuickbookData();
  if (!quickbooksData.token) {
    return null;
  }

  const quickbooksCustomer = await QuickBooks.createCustomer(
    JSON.parse(quickbooksData.token),
    quickbooksData.realmId,
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

  return {
    id: quickbooksCustomer.Id.toString(),
    syncToken: quickbooksCustomer.SyncToken.toString(),
  };
};

const createStripeCustomerForVendor = async (vendor) => {
  const customer = await Stripe.createCustomer({
    name: vendor.commercialName,
    email: vendor.email,
    phone: vendor.owner_phone,
    address: {
      country: vendor.country,
      city: vendor.city,
      state: vendor.state,
      line1: vendor.street_1,
    },
  });

  return customer.id.toString();
};

const validateStatusUpdate = async (id, vendor, status, updatedBy) => {
  let error = null;

  if (status === 'ARCHIVED' && vendor.status !== 'DISABLED')
    error = 'The merchant has to be disabled before archiving.';

  if (status === 'ACTIVE' && !vendor.approvedByDNB)
    error = 'The merchant has to be approved by DNb before activating.';

  if (error) {
    await logError({
      action: 'update',
      model: 'vendor',
      description: error,
      actionOn: id.toString(),
      updatedBy,
    });
    throw new Error(error);
  }
};

const alterVendorRefundListStatuses = async (
  id,
  refundListStatuses,
  updatedBy
) => {
  const vendor = await Vendor.findUnique({ where: { id } });

  try {
    const updatedVendor = await Vendor.update({
      where: { id },
      data: { refundListStatuses },
    });

    await logInfo({
      action: 'update',
      model: 'vendor',
      actionOn: id.toString(),
      updatedBy,
      oldValues: { refundListStatuses: vendor.refundListStatuses },
      newValues: { refundListStatuses: updatedVendor.refundListStatuses },
      updatedFields: ['refundListStatuses'],
      description: 'Change Vendor Refund List Statuses',
    });

    return updatedVendor;
  } catch (error) {
    await logError({
      action: 'update',
      model: 'vendor',
      description: JSON.stringify(error),
      actionOn: id.toString(),
      updatedBy,
    });
    throw new Error('Error while updating vendor.');
  }
};

const alterVendorRevenueShare = async (id, revenueShareEnabled, updatedBy) => {
  const vendor = await Vendor.findUnique({ where: { id } });

  try {
    const updatedVendor = await Vendor.update({
      where: { id },
      data: {
        revenueShareEnabled,
      },
    });

    await logInfo({
      action: 'update',
      model: 'vendor',
      actionOn: id.toString(),
      updatedBy,
      oldValues: { revenueShareEnabled: vendor.revenueShareEnabled },
      newValues: { revenueShareEnabled: updatedVendor.revenueShareEnabled },
      updatedFields: ['revenueShareEnabled'],
      description: 'Toggle vendor revenue share',
    });

    return updatedVendor;
  } catch (error) {
    await logError({
      action: 'update',
      model: 'vendor',
      description: JSON.stringify(error),
      actionOn: id.toString(),
      updatedBy,
    });
    throw new Error('Error while updating vendor.');
  }
};

const alterVendorDNBApproval = async (id, approvedByDNB, updatedBy) => {
  const vendor = await Vendor.findUnique({ where: { id } });

  try {
    const updatedVendor = await Vendor.update({
      where: { id },
      data: {
        approvedByDNB,
      },
    });

    await logInfo({
      action: 'update',
      model: 'vendor',
      actionOn: id.toString(),
      updatedBy,
      oldValues: { approvedByDNB: vendor.approvedByDNB },
      newValues: { approvedByDNB: updatedVendor.approvedByDNB },
      updatedFields: ['approvedByDNB'],
      description: 'Toggle vendor DNB Approval',
    });

    return updatedVendor;
  } catch (error) {
    await logError({
      action: 'update',
      model: 'vendor',
      description: JSON.stringify(error),
      actionOn: id.toString(),
      updatedBy,
    });
    throw new Error('Error while updating vendor.');
  }
};

const alterVendorRevenueSharePercentage = async (
  id,
  revenueSharePercentage,
  updatedBy
) => {
  const vendor = await Vendor.findUnique({ where: { id } });

  try {
    const updatedVendor = await Vendor.update({
      where: { id },
      data: {
        revenueSharePercentage,
      },
    });

    await logInfo({
      action: 'update',
      model: 'vendor',
      actionOn: id.toString(),
      updatedBy,
      oldValues: { revenueSharePercentage: vendor.revenueSharePercentage },
      newValues: {
        revenueSharePercentage: updatedVendor.revenueSharePercentage,
      },
      updatedFields: ['revenueSharePercentage'],
      description: 'Update vendor revenue share percentage',
    });

    return updatedVendor;
  } catch (error) {
    await logError({
      action: 'update',
      model: 'vendor',
      description: JSON.stringify(error),
      actionOn: id.toString(),
      updatedBy,
    });
    throw new Error('Error while updating vendor.');
  }
};

const alterVendorInvoicingCycleType = async (
  id,
  invoicingCycleType,
  updatedBy
) => {
  const vendor = await Vendor.findUnique({ where: { id } });

  try {
    const updatedVendor = await Vendor.update({
      where: { id },
      data: {
        invoicingCycleType,
      },
    });

    await logInfo({
      action: 'update',
      model: 'vendor',
      actionOn: id.toString(),
      updatedBy,
      oldValues: { invoicingCycleType: vendor.invoicingCycleType },
      newValues: { invoicingCycleType: updatedVendor.invoicingCycleType },
      updatedFields: ['invoicingCycleType'],
      description: 'Update vendor invoicing cycle type',
    });

    return updatedVendor;
  } catch (error) {
    await logError({
      action: 'update',
      model: 'vendor',
      description: JSON.stringify(error),
      actionOn: id.toString(),
      updatedBy,
    });
    throw new Error('Error while updating vendor.');
  }
};

module.exports = {
  retrieveVendors,
  retrieveVendorsCount,
  retrieveVendorById,
  retrieveVendorRefunds,
  retrieveVendorInvoices,
  retrieveVendorInvoicesStats,
  alterVendorStatus,
  alterVendorRefundListStatuses,
  alterVendorRevenueShare,
  alterVendorDNBApproval,
  alterVendorRevenueSharePercentage,
  alterVendorInvoicingCycleType,
  createQuickbooksCustomerForVendor,
  activateVendor,
};
