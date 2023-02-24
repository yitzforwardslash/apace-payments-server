const { REFUND_AMOUNT } = require('../../../utils/Constants');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const {
  globalSiteSetting,
  vendor: Vendor,
} = require('../../../prisma/prismaClient');
const ParseFloatNumber = require('../../../utils/ParseFloatNumber');

module.exports.generateRefundToken = (refundId, expirationDate) => {
  const expiresIn = moment(expirationDate)
    .add(1, 'year')
    .diff(moment(), 'seconds');
  return jwt.sign(
    {
      refundId,
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Calculates the refund after taking off our service fees
 * This should be the only source of computing the refund amount
 * @param {Number} totalAmount
 * @returns {Number} refund after taking off service fees
 */
module.exports.calculateRefund = async (vendorId, totalAmount) => {
  const vendor = await Vendor.findUnique({ where: { id: vendorId } });

  const percentage = Number.parseFloat(
    (
      await globalSiteSetting.findUnique({
        where: {
          key: vendor.revenueShareEnabled
            ? 'fee_percentage_revenue_share'
            : 'fee_percentage',
        },
      })
    ).value
  );
  const minimum = Number.parseFloat(
    (
      await globalSiteSetting.findUnique({
        where: { key: 'fee_minimum' },
      })
    ).value
  );

  const parsedAmount =
    (percentage / 100) * totalAmount > minimum
      ? (percentage / 100) * totalAmount
      : minimum;
  if (
    !parsedAmount ||
    parsedAmount <= 0 ||
    parsedAmount > Number.MAX_SAFE_INTEGER
  ) {
    throw new Error('Please provide a valid refund amount');
  }

  return ParseFloatNumber(totalAmount - parsedAmount);
};

module.exports.calculateFeePercentage = async (vendorId, totalAmount) => {
  const vendor = await Vendor.findUnique({ where: { id: vendorId } });

  const percentage = Number.parseFloat(
    (
      await globalSiteSetting.findUnique({
        where: {
          key: vendor.revenueShareEnabled
            ? 'fee_percentage_revenue_share'
            : 'fee_percentage',
        },
      })
    ).value
  );
  const minimum = Number.parseFloat(
    (
      await globalSiteSetting.findUnique({
        where: { key: 'fee_minimum' },
      })
    ).value
  );

  const feePercentage = (percentage / 100) * totalAmount > minimum ? percentage : ParseFloatNumber(parseFloat(minimum / totalAmount * 100).toFixed(2));
  return feePercentage;
};

module.exports.fullAmount = (amount) =>
  Math.floor((Number.parseFloat(amount) + Number.EPSILON) * 100) / 100;
