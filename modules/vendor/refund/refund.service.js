const { default: axios } = require('axios');
const {
  refund: Refund,
  invoice: Invoice,
  customerCard: CustomerCard,
  globalSiteSetting,
  vendor: Vendor,
  revenueShare: RevenueShare,
  refund,
} = require('../../../prisma/prismaClient');
const { calculateRefund } = require('./refund.utils');
const parseFloatNumber = require('../../../utils/ParseFloatNumber');
const REFUND_MAXIMUM_DURATION = 15; // In minutes
const logger = require('../../../utils/Logger');
const { ExpiredRefundError } = require('../../../utils/CustomError');
const SendGrid = require('../../../utils/SendGrid');
const {
  calculateTotalPages,
  calculatenNextCursor,
} = require('../../../utils/Pagination');
const AptPay = require('../../../utils/AptPay');
const Encrypt = require('../../../utils/Encrypt');
const { REFUND_STEPS } = require('../../../utils/Constants');
const { addRevenueShare } = require('../revenueShare/revenueShareService');
const { getAgreementURL } = require('./agreement/agreement.service');
const DEFAULT_ITEM_IMAGE_URL = process.env.DEFAULT_ITEM_IMAGE_URL;

/**
 * @param {Date} agreementDate
 * @param {Date} termsDate
 */
module.exports.updateAgreement = async (refundId, agreementDate, termsDate) => {
  const agreementUrl = await getAgreementURL(
    refundId,
    new Date(agreementDate),
    true
  );

  return await Refund.update({
    where: { id: refundId },
    data: {
      agreementUrl,
      agreementDate: new Date(agreementDate),
      termsDate: new Date(termsDate),
      lastUpdated: new Date(),
    },
  });
};
/**
 * @typedef {Object} Refund
 * @property {Number} id
 * @property {String} vendorId
 * @property {Array<String>} productIds
 * @property {String} orderId
 * @property {String} cardLast
 * @property {String} cvv
 * @property {Number} lockedToCardId
 * @property {Number} amount
 * @property {Boolean} expired
 * @property {Date} expirationDate
 * @property {String} customerFName
 * @property {String} customerLName
 * @property {String} customerEmail
 * @property {String} cardLastFour
 * @property {Boolean} cardLastFourVerified
 * @property {Date} linkClickedAt
 * @property {String} status
 */

/**
 * Gets refund data
 * @param {String} refundId
 * @returns {Refund}
 */
module.exports.getRefund = (refundId) =>
  Refund.findUnique({
    where: { id: refundId },
    include: {
      refundItems: true,
      vendor: true,
      customerCard: true,
      refundNotification: true,
    },
  })
    .then(async (result) =>
      result
        ? {
            id: result.id,
            eligibleAmount: await calculateRefund(
              result.vendorId,
              result.amount
            ),
            totalAmount: result.amount,
            expirationDate: result.expirationDate,
            expired: result.expired,
            vendorId: result.vendorId,
            orderDate: result.orderDate,
            orderId: result.orderId,
            isPartialRefund: result.isPartialRefund,
            orderUrl: result.orderUrl,
            disabled: result.disabled,
            vendor: {
              id: result.vendor.id,
              commercialName: result.vendor.commercialName,
              logoUrl: result.vendor.logoUrl,
            },
            agreementUrl: result.agreementUrl,
            status: result.status,
            customerFName: result.customerFName,
            customerLName: result.customerLName,
            customerEmail: result.customerEmail,
            cardLastFour: result.cardLastFour,
            cardLastFourVerified: result.cardLastFourVerified,
            refundItems: result.refundItems,
            linkClickedAt: result.linkClickedAt,
            refundDepositedAt: result.refundDepositedAt,
            lockedToCardId: result.lockedToCardId,
            customerCard: result.customerCard
              ? {
                  id: result.customerCard.id,
                  lastFour: result.customerCard.lastFour,
                  network: result.customerCard.network,
                }
              : {},
            refundNotification: result.refundNotification
              ? {
                  redirectUrl: result.refundNotification.redirectUrl,
                }
              : null,
          }
        : -1
    )
    .catch((error) => {
      logger.error(error);
      return -1;
    });

module.exports.lockCardToRefund = (cardId, refundId) =>
  Refund.update({
    where: { id: refundId },
    data: { lockedToCard: { connect: { id: cardId } } },
  });

// ==================== Refund Timeline =======================

/**
 * Marks refund link clicked and steps step to 1
 * @param {String} refundId
 */
module.exports.markRefundLinkClicked = (refundId) =>
  Refund.updateMany({
    where: { id: refundId, lastStep: 0, status: 'initialized' },
    data: {
      lastStep: REFUND_STEPS.DETAILS,
      linkClickedAt: new Date(),
      status: 'viewed',
    },
  });

/**
 * Marks refund email opeend
 * @param {String} refundId
 */
module.exports.markRefundEmailOpened = (refundId) =>
  Refund.updateMany({
    where: { id: refundId, emailOpenedAt: null },
    data: { emailOpenedAt: new Date() },
  });

/**
 * Moves refund timeline to step number
 * @param {String} refundId
 * @param {Number} step
 */
module.exports.moveRefundTimelineToStep = (refundId, step) =>
  Refund.updateMany({
    where: { id: refundId, lastStep: { lt: step } },
    data: { lastStep: step },
  });

/**
 *
 * @param {String} refundId
 */
module.exports.markReceiverVerified = (refundId) =>
  Refund.updateMany({
    where: { id: refundId, status: 'viewed' },
    data: { status: 'receiverVerified' },
  });

/**
 *
 * @param {String} refundId
 */
module.exports.markRefundLastFourVerified = (refundId) =>
  Refund.updateMany({
    where: { id: refundId },
    data: { cardLastFourVerified: true },
  });

/**
 *
 * @param {String} refundId
 */
module.exports.cancelRefund = (refundId) =>
  Refund.updateMany({
    where: {
      id: refundId,
      status: { in: ['initialized', 'viewed', 'receiverVerified', 'failed'] },
    },
    data: { status: 'canceled' },
  });

/**
 * Gets refund data
 * @param {String} refundId
 * @returns {Refund}
 */
module.exports.getRefundLastFour = (refundId) =>
  Refund.findUnique({ where: { id: refundId }, select: { cardLastFour: true } })
    .then((result) => (result ? result.cardLastFour : -1))
    .catch((error) => {
      logger.error(error);
      return -1;
    });

/**
 *
 * @param {String} refundId
 */
module.exports.linkRefundToCustomer = (refundId, customerId) =>
  Refund.update({
    where: { id: refundId },
    data: {
      customer: {
        connect: { id: customerId },
      },
    },
  });

/**
 * Checks if theres any previous refund requests with the same data
 * @param {Object} refundData
 * @param {String} refundData.productIds
 * @param {String} refundData.orderId
 * @param {String} refundData.vendorId
 * @returns {Promise<Boolean>}
 */
const isPreviousRefundExists = ({ productIds, orderId, vendorId }) =>
  Refund.findMany({
    where: {
      orderId,
      productIds: { hasSome: productIds },
      vendorId,
      expirationDate: { gte: new Date() },
      status: {
        notIn: ['failed', 'processed', 'canceled'],
      },
      expired: false,
    },
  }).then((matchedRefunds) => matchedRefunds.length);

/**
 * Creates a new refund and returns back its id
 * @param {Refund} refundData
 * @returns {Promise<String>} refundId
 */
module.exports.createRefund = async (refundData, vendorId) => {
  if (await isPreviousRefundExists({ ...refundData, vendorId })) {
    return -1;
  }
  const expirationDate = new Date();
  expirationDate.setMinutes(
    expirationDate.getMinutes() + REFUND_MAXIMUM_DURATION
  );

  return Refund.create({
    data: {
      ...refundData,
      expirationDate,
      vendor: { connect: { id: vendorId } },
    },
  })
    .then((refund) => refund.id)
    .catch((error) => {
      logger.error(error);
      return -1;
    });
};

/**
 * Does not change the status of the refund, only check the card
 * @param {String} lastFour
 * @param {String} refundId
 * @returns {Promise<Boolean>}
 */
module.exports.isCardMatchRefund = (lastFour, refundId) =>
  Refund.findMany({
    where: {
      id: { equals: refundId },
      expirationDate: { gt: new Date() },
      status: {
        equals: 'viewed',
      },
    },
  }).then(([refundData]) => {
    if (!refundData) {
      throw new ExpiredRefundError(refundId);
    }
    return lastFour == refundData.cardLastFour;
  });
/**
 * Updates a refund status to be pending to prevent any concurrency problems
 * @param {String} refundId
 * @param {Number} customerId
 * @returns {Promise<Boolean>} whether updated successfuly or not
 */
const updateRefundStatus = (refundId, vendorId, fromStatus, toStatus) =>
  Refund.updateMany({
    where: {
      id: refundId,
      status: fromStatus,
      vendorId,
      expirationDate: { gt: new Date() },
    },
    data: {
      status: toStatus,
      refundDate: toStatus !== 'failed' ? new Date() : null,
      lastUpdated: new Date(),
    },
  }).then((lockedItems) => lockedItems.count);

const updateRefundLink = (refundId, status, transaction) =>
  Refund.update({
    where: {
      id: refundId,
    },
    data: { status, transaction, lastUpdated: new Date() },
  });

module.exports.getRefundFees = async (vendorId) => {
  const vendor = await Vendor.findUnique({ where: { id: vendorId } });

  const percentage = await globalSiteSetting.findUnique({
    where: {
      key: vendor.revenueShareEnabled
        ? 'fee_percentage_revenue_share'
        : 'fee_percentage',
    },
  });
  const minimum = await globalSiteSetting.findUnique({
    where: { key: 'fee_minimum' },
  });

  return {
    percentage: percentage ? parseFloat(percentage.value) : 0,
    minimum: minimum ? parseFloat(minimum.value) : 0,
  };
};

/**
 *
 * @param {*} refundId
 * @param {*} vendorId
 * @returns {Promise<Boolean>} if enabled or not
 */

module.exports.isRefundEnabledByVendor = async (refundId, vendorId) => {
  console.log({
    id: refundId,
    // status: 'receiverVerified',
    vendorId,
    expirationDate: { gt: new Date() },
  });
  const refundsData = await Refund.findMany({
    where: {
      id: refundId,
      // status: 'receiverVerified',
      vendorId,
      expirationDate: { gt: new Date() },
    },
    select: {
      id: true,
      refundVerification: true,
    },
  });

  console.log({ refundsData });
  if (!refundsData.length) {
    return false;
  }

  const refundData = refundsData[0];

  if (refundData.refundVerification && refundData.refundVerification.url) {
    const { method, url } = refundData.refundVerification;

    try {
      const { data } = await axios[method](url);
      console.log({ data });
      if (data && data.allow_refund) {
        return true;
      }

      if (data && data.refund_issued) {
        await Refund.update({
          where: { id: refundData.id },
          data: { status: 'refundByVendor' },
        });
        return false;
      }

      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  return true;
};

module.exports.syncExpiredState = (refundId) =>
  Refund.updateMany({
    where: {
      id: refundId,
      expirationDate: {
        lt: new Date(),
      },
      status: {
        notIn: ['processed', 'pending'],
      },
      expired: false,
    },
    data: {
      expired: true,
    },
  });

module.exports.canProcessRefund = async (refundId, vendorId) => {
  const isEnabled = await this.isRefundEnabledByVendor(refundId, vendorId);
  if (!isEnabled) return false;

  const refund = await Refund.findFirst({
    where: { id: refundId, status: 'receiverVerified', expired: false },
  });

  if (!refund) return false;

  return true;
};
/**
 * Creates a transaction and updates the required db state
 * @param {*} fundingSource
 * @param {*} refundId
 * @returns {Promise<Boolean>} if pending or processed
 */
module.exports.processTransaction = async (cardId, refundId, vendorId) => {
  const [refundData] = await Refund.findMany({
    where: {
      id: refundId,
      status: 'receiverVerified',
      vendorId,
      expirationDate: { gt: new Date() },
    },
    include: { vendor: true },
  });
  if (!refundData) {
    throw new ExpiredRefundError(refundId);
  }
  const lockedRefund = await updateRefundStatus(
    refundId,
    vendorId,
    'receiverVerified',
    'pending'
  );
  if (!lockedRefund) {
    throw new ExpiredRefundError(refundId);
  }
  try {
    const card = await CustomerCard.findUnique({
      where: { id: cardId },
      include: { customer: true },
    });
    const refundAmountAfterFees = await calculateRefund(
      refundData.vendorId,
      refundData.amount
    );
    const { id: aptpayId, status: transactionStatus } =
      await AptPay.createCardDisbursement({
        amount: refundAmountAfterFees,
        currency: 'USD',
        disbursementNumber: Encrypt.decrypt(card.number),
        expirationDate: Encrypt.decrypt(card.expirationDate),
        referenceId: refundId,
        payeeId: card.customer.aptpayId,
        descriptor: `${refundData.orderId}: ${refundData.vendor.commercialName}`
          .split('')
          .filter((a) => a.match(/^[\sa-zA-Z0-9]*$/))
          .join('')
          .substr(0, 11),
        custom1: `MerchantID: ${refundData.vendor.id}`,
        custom2: `Merchant Name: ${refundData.vendor.commercialName}`,
        custom3: `CustomerID: ${card.customer.id}`,
        custom4: `Customer Name: ${card.customer.firstName} ${card.customer.lastName}`,
      });

    const newStatus =
      process.env.NODE_ENV === 'production' ? transactionStatus : 'processed';

    await Refund.update({
      where: { id: refundId },
      data: {
        feeAmount: refundData.amount - refundAmountAfterFees,
        transaction: {
          create: {
            transactionId: aptpayId,
            status: transactionStatus,
            processor: 'aptpay',
          },
        },
        customerCard: { connect: { id: cardId } },
        customer: { connect: { id: card.customer.id } },
      },
    });

    return { transactionStatus, refundedAmount: refundAmountAfterFees };
  } catch (err) {
    await Refund.update({
      where: { id: refundId },
      data: { status: 'receiverVerified' },
    });
    throw err;
  }
};

module.exports.syncRefundStatus = async (refundId) => {
  const refundData = await Refund.findUnique({
    where: { id: refundId },
    include: { transaction: true },
  });
  const aptpayStatus = await AptPay.getDisbursmentStatus(
    refundData.transaction.transactionId
  );

  console.log('Syncing refund status', {
    refundId,
    status: refundData.status,
    aptpayStatus,
  });
  const update = {
    transaction: {
      update: {
        status: aptpayStatus,
      },
    },
  };

  if (
    (aptpayStatus === 'SETTLED' || aptpayStatus === 'APPROVED') &&
    refundData.status !== 'processed'
  ) {
    update.status = 'processed';
    update.refundDepositedAt = new Date();
    update.refundDate = new Date();
    update.transaction.update.status = 'paid';
    await addRevenueShare(refundData);
  } else if (aptpayStatus.includes('ERROR')) {
    update.status = 'failed';
    update.transaction.update.status = 'error';
  }

  await Refund.update({
    where: { id: refundId },
    data: update,
  });

  return aptpayStatus;
};

/**
 *
 * @param {String} transaction
 * @returns
 */
module.exports.getRefundByTransaction = (transaction) =>
  Refund.findFirst({
    where: { transaction },
    include: { refundNotification: true },
  });

/**
 *
 * @param {String} transaction
 * @param {String} status
 * @returns
 */
module.exports.updateRefundAfterACK = (transaction, status) =>
  Refund.updateMany({
    where: { transaction, status: 'pending' },
    data: { status, lastUpdated: new Date() },
  });

/**
 * @param {Date} fromDate
 * @param {Date} toDate
 * @returns {Promise<Array>}
 */
module.exports.getAllPendingRefunds = (
  fromDate = new Date('2021'),
  tillDate = new Date()
) =>
  Refund.findMany({
    where: {
      createdAt: { lt: tillDate, gt: fromDate },
      status: 'pending',
      transactionId: { not: null },
    },
    select: { id: true },
  });

module.exports.updatePendingRefunds = (refundIds, newStatus) =>
  Refund.updateMany({
    where: { id: { in: refundIds } },
    data: { status: newStatus, lastUpdated: new Date() },
  });

module.exports.getRefundCustomer = (refundId) =>
  Refund.findUnique({
    where: { id: refundId },
    select: {
      vendorId: true,
      amount: true,
      customer: { select: { email: true, firstName: true, lastName: true } },
    },
  });

module.exports.getRefundCustomerByTransaction = (transaction) =>
  Refund.findFirst({
    where: { transaction },
    select: {
      vendorId: true,
      amount: true,
      customer: { select: { email: true, firstName: true, lastName: true } },
    },
  });
module.exports.sendFailureEmail = async ({ refundId, transaction }) => {
  let customer, amount, vendorId;

  if (refundId) {
    const refund = await this.getRefundCustomer(refundId);
    customer = refund.customer;
    amount = refund.amount;
    vendorId = refund.vendorId;
  } else {
    const refund = await this.getRefundCustomerByTransaction(transaction);
    customer = refund.customer;
    amount = refund.amount;
    vendorId = refund.vendorId;
  }
  if (!customer) {
    logger.error(
      'At ',
      new Date().toLocaleString(),
      ' the refund',
      refundId,
      ' failed, but no customer attached to it!!'
    );
    return;
  }
  await SendGrid.send({
    dynamicTemplateData: {
      amount: await calculateRefund(vendorId, amount),
      firstName: customer.firstName,
      lastName: customer.lastName,
    },
    from: {
      email: process.env.SENDING_EMAIL_CUSTOMERS,
      name: 'Apace Payments',
    },
    templateId: process.env.SENDGRID_REFUND_FAILED_TEMPLATE,
    to: customerEmail,
  });
};

const refundSelections = {
  id: true,
  refundNumber: true,
  amount: true,
  status: true,
  createdAt: true,
  expired: true,
  lastUpdated: true,
  isPartialRefund: true,
  customer: { select: { firstName: true, lastName: true, email: true } },
  customerEmail: true,
  customerFName: true,
  customerLName: true,
  invoice: {
    select: {
      id: true,
      date: true,
      status: true,
      totalAmount: true,
      dueDate: true,
    },
  },
};

/**
 * Gets all refunds for a specific vendor
 * @param {String} vendorId
 * @param {Number} currentCursor
 * @param {Number} pageLength
 * @returns {Promise<Object>}
 */
module.exports.getVendorRefunds = async (
  vendorId,
  currentCursor,
  pageLength,
  { fromDate, toDate, status } = {}
) => {
  if (!pageLength) {
    pageLength = 50;
  }
  if (!currentCursor || currentCursor === 0) {
    currentCursor = 1;
  }

  const dateFilter = {
    refundDate: {},
  };
  if (fromDate) {
    dateFilter.refundDate.gte = fromDate;
  }
  if (toDate) {
    dateFilter.refundDate.lte = toDate;
  }

  const where = {
    vendorId,
    ...(fromDate || toDate ? dateFilter : {}),
  };

  if (status) {
    if (Array.isArray(status)) {
      where.status = { in: status };
    } else {
      where.status = status;
    }
  }

  const totalCount = await Refund.count({
    where,
  });
  const totalPages = calculateTotalPages(totalCount, pageLength);
  const refundsQuery = {
    take: pageLength,
    where,
    orderBy: { createdAt: 'desc' },
    select: refundSelections,
  };
  if (currentCursor && currentCursor !== 1) {
    refundsQuery.skip = (currentCursor - 1) * pageLength;
  }
  const refunds = (await Refund.findMany(refundsQuery)).map((refund) => ({
    ...refund,
    amount: parseFloatNumber(refund.amount),
  }));
  const nextCursor = totalPages > currentCursor ? currentCursor + 1 : null;

  return { refunds, nextCursor, totalCount, totalPages };
};

/**
 * @typedef {Object} RefundInvoice
 * @property {Number} id
 * @property {Number} amount
 */

/**
 * Gets all refunds that are not invoiced yet for this vendor during this period
 * @param {String} vendorId
 * @param {Date} fromDate
 * @param {Date} toDate
 * @returns {Promise<Array<RefundInvoice>>}
 */
module.exports.getNotInvoicedRefunds = (vendorId, fromDate, toDate) =>
  Refund.findMany({
    where: {
      vendorId,
      status: 'processed',
      invoiceId: null,
    },
    select: {
      id: true,
      amount: true,
    },
  });

module.exports.getNotInvoicedRefundsAmount = (vendorId, fromDate, toDate) =>
  Refund.aggregate({
    where: {
      vendorId,
      status: 'processed',
      invoiceId: null,
    },
    _sum: { amount: true },
    _count: { id: true },
  }).then((total) => ({ sum: total._sum.amount, count: total._count.id }));

const refundInvoiceSelections = {
  id: true,
  refundNumber: true,
  amount: true,
  status: true,
  refundDate: true,
  customer: { select: { firstName: true, lastName: true, email: true } },
  productIds: true,
  orderId: true,
};
/**
 * @param {Number} invoiceId
 * @param {Number} cursor
 * @param {Number} pageLength
 * @returns {Promise}
 */
module.exports.getInvoiceRefunds = async (invoiceId, cursor, pageLength) => {
  if (!pageLength) {
    pageLength = 1000;
  }
  const refundsQuery = {
    where: { invoiceId },
    take: pageLength,
    orderBy: { refundNumber: 'asc' },
    select: refundInvoiceSelections,
  };
  if (cursor) {
    refundsQuery.skip = 1;
    refundsQuery.cursor = { refundNumber: cursor };
  }

  const [totalCount, refunds] = await Promise.all([
    Refund.count({ where: { invoiceId } }),
    Refund.findMany(refundsQuery).then((refunds) =>
      refunds.map((refund) => ({
        ...refund,
        amount: parseFloatNumber(refund.amount),
      }))
    ),
  ]);
  if (totalCount === 0) {
    return;
  }
  const totalPages = calculateTotalPages(totalCount, pageLength);
  const nextCursor = calculatenNextCursor(refunds, 'refundNumber');
  return { totalCount, refunds, totalPages, nextCursor };
};

const refundCustomerSelections = {
  id: true,
  refundNumber: true,
  amount: true,
  status: true,
  refundDate: true,
  invoice: true,
};
module.exports.getCustomerRefunds = async (customerId, cursor, pageLength) => {
  if (!pageLength) {
    pageLength = 10;
  }
  const refundsQuery = {
    where: { customerId },
    take: pageLength,
    orderBy: { id: 'desc' },
    select: refundCustomerSelections,
  };
  if (cursor) {
    refundsQuery.skip = 1;
    refundsQuery.cursor = { id: cursor };
  }
  const [totalCount, refunds] = await Promise.all([
    Refund.count({ where: { customerId } }),
    Refund.findMany(refundsQuery).then((refunds) =>
      refunds.map((refund) => ({
        ...refund,
        amount: parseFloatNumber(refund.amount),
      }))
    ),
  ]);
  if (totalCount === 0) {
    return;
  }
  const totalPages = calculateTotalPages(totalCount, pageLength);
  const nextCursor = calculatenNextCursor(refunds);
  return { totalCount, refunds, totalPages, nextCursor };
};

const refunDetailsSelection = {
  id: true,
  refundNumber: true,
  orderUrl: true,
  vendorId: true,
  productIds: true,
  orderId: true,
  isPartialRefund: true,
  amount: true,
  status: true,
  disabled: true,
  agreementDate: true,
  agreementUrl: true,
  termsDate: true,
  refundDate: true,
  expirationDate: true,
  customerEmail: true,
  customerFName: true,
  customerLName: true,
  refundLink: true,
  createdAt: true,
  emailSentAt: true,
  emailOpenedAt: true,
  linkClickedAt: true,
  refundDepositedAt: true,
  expired: true,
  refundDate: true,
  transaction: true,
  refundItems: true,
  cardLastFour: true,
  cardLastFourVerified: true,
  lockedToCardId: true,
  customerCard: {
    select: {
      id: true,
      lastFour: true,
      network: true,
    },
  },
  customer: {
    select: { firstName: true, lastName: true, email: true, phone: true },
  },
  invoice: {
    select: {
      id: true,
      status: true,
      date: true,
      dueDate: true,
      totalAmount: true,
    },
  },
};

/**
 * @param {String} refundId
 * @param {String} vendorId
 * @returns {Promise}
 */
module.exports.getRefundDetails = (refundId, vendorId) =>
  Refund.findUnique({
    where: { id: refundId },
    select: refunDetailsSelection,
  }).then(async (refund) => {
    if (!refund || refund.vendorId !== vendorId) {
      return;
    }
    refund.amount = parseFloatNumber(refund.amount);
    if (refund.invoice) {
      refund.invoice.totalAmount = parseFloatNumber(refund.invoice.totalAmount);
    }

    refund.refundItems.forEach((item) => {
      if (!item.itemImageUrl) {
        item.itemImageUrl = DEFAULT_ITEM_IMAGE_URL;
      }
    });

    const refundRes = { ...refund };

    const refundFees = await this.getRefundFees(refund.vendorId);
    refundRes.fees = refundFees;

    return refundRes;
  });
