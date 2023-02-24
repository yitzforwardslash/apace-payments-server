const { default: axios } = require('axios');
const { refund: Refund } = require('../../prisma/prismaClient');
const refundService = require('../vendor/refund/refund.service');
const { generateRefundToken } = require('../vendor/refund/refund.utils');
const SendGrid = require('../../utils/SendGrid');
const moment = require('moment');
const { ExternalInvalidEmailError, ExternalValidationError } = require('../../utils/CustomError');

/**
 * @typedef {Object} ExternalRefund
 * @property {String} vendorId
 * @property {String} orderId
 * @property {String} orderUrl
 * @property {Number} refundAmount
 * @property {String} cardLastFour
 * @property {String} customerEmail
 * @property {String} customerFName
 * @property {String} customerLName
 * @property {Boolean} isPartialRefund
 * @property {Date} expirationDate
 * @property {Array<RefundItem>} items
 * @property {RefundVerification} refundVerification
 * @property {RefundNotification} refundNotification
 */

/**
 * @typedef {Object} RefundItem
 * @property {String} itemId
 * @property {String} sku
 * @property {String} itemUrl
 * @property {String} itemImageUrl
 * @property {String} displayName
 * @property {String} returnDate
 * @property {String} orderDate
 * @property {Number} unitPrice
 * @property {Number} returnQty
 */

/**
 * @typedef {Object} RefundVerification
 * @property {String} method
 * @property {String} url
 */
/**
 * @typedef {Object} RefundNotification
 * @property {String} webhookUrl
 * @property {String} redirectUrl
 * @property {String} redirectMethod
 */

/**
 * @param {ExternalRefund} refundData
 * @returns {Promise}
 */

module.exports.createExternalRefund = async (refundData) => {
  const latestRefund = await Refund.findFirst({
    where: { vendorId: refundData.vendorId },
    orderBy: { createdAt: 'desc' },
  });

  const nextRefundNumber =
    latestRefund && latestRefund.refundNumber
      ? latestRefund.refundNumber + 1
      : 1000;

  const refundId = await refundService.createRefund(
    {
      amount: refundData.refundAmount,
      cardLastFour: refundData.cardLastFour,
      orderId: refundData.orderId,
      productIds: refundData.items.map((item) => item.itemId),
    },
    refundData.vendorId
  );

  if (!refundId || refundId === -1) {
    return false;
  }
  const refundToken = generateRefundToken(refundId, refundData.expirationDate);

  await Refund.update({
    where: { id: refundId },
    data: {
      refundNumber: nextRefundNumber,
      refundLink: `${process.env.APACE_EXTERNAL_REFUND_URL}/${refundToken}?refund_id=${refundId}&vendor_id=${refundData.vendorId}`,
      orderDate: refundData.orderDate,
      orderUrl: refundData.orderUrl,
      customerEmail: refundData.customerEmail || '',
      customerFName: refundData.customerFName || '',
      customerLName: refundData.customerLName || '',
      isPartialRefund: refundData.isPartialRefund || false,
      ...(refundData.publicId
        ? {
            vendorToken: {
              connect: {
                publicId: refundData.publicId,
              },
            },
          }
        : {}),
      cardType: refundData.cardType,
      expirationDate: refundData.expirationDate,
      refundItems: {
        createMany: {
          data: refundData.items,
        },
      },
      refundNotification: {
        create: refundData.refundNotification,
      },
      refundVerification: {
        create: refundData.refundVerification,
      },
    },
  });

  return refundService.getRefundDetails(refundId, refundData.vendorId);
};

/**
 *
 * @param {String} url
 * @param {String} method
 * @returns {Promise<Boolean>} if enabled or not
 */
module.exports.isEnableLinkValid = async (url, method) => {
  try {
    const { data } = await axios[method](url);
    if (data && Object.keys(data).includes('allow_refund')) {
      return true;
    }

    return false;
  } catch (err) {
    return false;
  }
};

/**
 * @param {String} vendorId
 * @param {String} refundId
 */
module.exports.sendRefundEmail = async (vendorId, refundId) => {
  const refund = await Refund.findFirst({
    where: { id: refundId, vendorId },
    include: { vendor: true, refundItems: true },
  });
  if (!refund) {
    throw new ExternalValidationError(['Invalid refund id']);
  }
  if (!refund.customerEmail) {
    throw new ExternalInvalidEmailError();
  }

  const refundData = {
    tracking_img: `${process.env.API_URL}ext/refunds/${refundId}/email_tracking/empty_img.png`,
    refund_link: refund.refundLink,
    refund_id: refund.id,
    first_name: refund.customerFName || '',
    refund_amount: parseFloat(refund.amount).toFixed(2),
    vendor: refund.vendor.commercialName,
    vendor_logo: refund.vendor.logoUrl,
    order_id: refund.orderId,
    order_date: moment(refund.orderDate, 'MM/DD/YYYY').format('MMM DD, YYYY'),
    is_partial_refund: refund.isPartialRefund,
    items: refund.refundItems.map((item) => ({
      title: item.displayName,
      item_img: item.itemImageUrl,
      return_date: moment(item.returnDate, 'MM/DD/YYYY').format('MMM DD, YYYY'),
      item_price: parseFloat(item.unitPrice * item.returnQty).toFixed(2),
    })),
  };

  await SendGrid.send({
    dynamicTemplateData: refundData,
    from: {
      email: process.env.SENDING_EMAIL_CUSTOMERS,
      name: 'Apace Payments',
    },
    templateId: process.env.SENDGRID_REFUND_VENDOR_EXT_TEMPLATE,
    to: refund.customerEmail,
  });

  await Refund.update({
    where: { id: refundId },
    data: { emailSent: true, emailSentAt: new Date() },
  });
};

module.exports.cancelRefund = async (refundId, vendorId) => {
  const refund = await Refund.findFirst({
    where: {
      id: refundId,
      vendorId,
      status: { notIn: ['pending', 'processed', 'failed'] },
    },
  });
  if (!refund) throw new Error('Cannot cancel refund at this time');

  await Refund.update({
    where: { id: refund.id },
    data: {
      status: 'canceled',
    },
  });

  return true;
};
