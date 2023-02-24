const { createRefund } = require('../../modules/vendor/refund/refund.service');
const { createVendor } = require('./vendor');
const { refund: Refund } = require('../../prisma/prismaClient');
const { generateRefundToken } = require('../../modules/refund/refund.utils');

const vendor = createVendor();

/**
 *
 * @param {String} vendorId
 * @returns {Promise<Number>}
 */
module.exports.createRefund = async (vendorId, lastFour) => {
  const refundData = {
    productIds: [Date.now().toString()],
    orderId: Date.now().toString(),
    cardLastFour: lastFour || '1111',
    amount: 1000 * Math.random(),
  };
  if (!vendorId) {
    vendorId = (await vendor).id;
  }
  const refundId = await createRefund(refundData, vendorId);
  return {
    id: refundId,
    refundToken: generateRefundToken(refundId),
  };
};

/**
 * @param {String} vendorId
 * @param {Date} refundDate
 * @returns {Promise<Number>}
 */
module.exports.createVerifiedRefund = async (vendorId) => {
  const refundData = {
    productIds: [Date.now().toString()],
    orderId: Date.now().toString(),
    cardLastFour: '1111',
    amount: 1,
  };
  if (!vendorId) {
    vendorId = (await vendor).id;
  }
  const refundId = await createRefund(refundData, vendorId);
  await Refund.update({
    where: { id: refundId },
    data: { status: 'receiverVerified' },
  });
  return refundId;
};

/**
 * @param {String} vendorId
 * @param {Date} refundDate
 * @returns {Promise<Number>}
 */
module.exports.createProcessedRefund = async (vendorId, refundDate) => {
  const { id: refundId } = await this.createRefund(vendorId);
  if (!refundDate) {
    refundDate = new Date();
  }
  await Refund.update({
    where: { id: refundId },
    data: { refundDate, status: 'processed' },
  });
  return refundId;
};

module.exports.createProcessedRefunds = async (
  vendorId,
  refundNumber,
  refundDate
) => {
  const refunds = [];
  for (let i = 0; i < refundNumber; i++) {
    refunds.push(this.createProcessedRefund(vendorId, refundDate));
  }
  return Promise.all(refunds);
};
