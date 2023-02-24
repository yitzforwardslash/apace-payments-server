const {
  customer: Customer,
  refund: Refund,
  payout: Payout,
  invoice: Invoice,
  vendor: Vendor,
} = require('../../prisma/prismaClient');
const {
  createRefundWebhookEventAndPublish,
} = require('../refundWebhookEvent/refundWebhookEvent.service');
const {
  addRevenueShare,
  markRevenueSharesWithHasPaidInvoice
} = require('../vendor/revenueShare/revenueShareService');

const ERROR_CODE_MESSAGE = {
  M001: 'Resource Error - Web server is not accessible.',
  M002: 'Invalid input value - Values contained an invalid value.',
  M003: 'Declined',
  M004: 'System error',
  M005: 'Invalid input length',
  M006: 'Invalid input format',
  M007: 'Missing required input - You have not entered the mandatory data fields.',
  M008: 'Limit exceeded - You have exceeded the limit for the transaction.',
  M009: "Account not eligible for receiving funds - Receiver's account is not eligible to receive funds.",
  M010: 'Amount exceeds network limit',
  M011: 'Invalid card type - Payee card is not supported.',
  M012: 'Reversal - The disbursement has been reversed.',
  M013: 'Chargeback - Chargeback was intiated by the issuer.',
  M014: 'Representment - A financial transaction originated by an Acquirer to partially or wholly recover funds charged back to the Acquirer by an Issuer.',
  M015: 'Network error - A relevant Receive Network reconciles a transaction differently than how it was processed.',
  M016: 'Cutoff timing - A relevant Receive Network did not settle on the expected cutoff date.',
  M017: 'Partial approvals are not supported for pyaments by the relevant Receive Network',
  M018: 'Error',
  M019: 'Service Error - There is an unavailability to process payment.',
};

module.exports.handlePayeeAction = async (data) => {
  const { id, status, errorCode } = data;

  await Customer.updateMany({
    where: { aptpayId: id.toString() },
    data: { aptpayStatus: status, aptpayErrorCode: errorCode },
  });

  return true;
};

module.exports.handleDisbursementAction = async (data) => {
  const { id, status, errorCode, info } = data;

  let refund = await Refund.findFirst({
    where: {
      transaction: { transactionId: id.toString(), processor: 'aptpay' },
    },
  });

  if (!refund) {
    return await handlePayoutDisbursementAction(data);
  }

  const update = {
    transaction: {
      update: {
        status,
        errorCode,
        info: typeof info === 'string' ? info : JSON.stringify(info),
      },
    },
  };

  if (status === 'OK') {
    update.transaction.update.status = 'created';
  } else if (
    (status === 'SETTLED' || status === 'APPROVED') &&
    refund.status !== 'processed'
  ) {
    update.status = 'processed';
    update.refundDepositedAt = new Date();
    update.refundDate = new Date();
    update.transaction.update.status = 'paid';
    await addRevenueShare(refund);
  } else if (status && status.includes('ERROR')) {
    update.status = 'failed';
    update.transaction.update.status = 'error';
    update.transaction.update.errorCode = ERROR_CODE_MESSAGE[errorCode] || '';
  }

  await Refund.update({
    where: {
      id: refund.id,
    },
    data: update,
  });

  refund = await Refund.findUnique({ where: { id: refund.id } });

  if (refund.status === 'failed' || refund.status === 'processed') {
    await createRefundWebhookEventAndPublish(refund.id);
  }

  return true;
};

const handlePayoutDisbursementAction = async (data) => {
  const payout = await Payout.findFirst({ where: { transactionId: data.id } });

  if (!payout) {
    return await handleInvoicePaymentAction(data);
  }

  await Payout.update({
    where: { id: payout.id },
    data: {
      status: data.status,
    },
  });

  return true;
};

const handleInvoicePaymentAction = async (data) => {
  const { id, status, errorCode, info } = data;
  const invoice = await Invoice.findFirst({
    where: { chargeId: id.toString(), chargeProcessor: 'aptpay' },
  });

  if (!invoice) {
    return true;
  }

  const update = {
    chargeStatus: status,
    chargeInfo: `${errorCode || ''} ${info || ''}`,
  };

  if (status === 'SETTLED' || status === 'APPROVED') {
    update.status = 'paid';
  } else if (status && status.includes('ERROR')) {
    update.status = 'unpaid';
  }

  await Invoice.update({
    where: {
      id: invoice.id,
    },
    data: update,
  });

  if (update.status === 'paid') {
    await markRevenueSharesWithHasPaidInvoice(invoice.id, invoice.vendorId);
  }

  return true;
};
