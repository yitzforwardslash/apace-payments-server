const path = require('path');
const moment = require('moment');
const express = require('express');
const externalService = require('./external.service');
const vendorService = require('../vendor/vendor.service');
const refundService = require('../vendor/refund/refund.service');
const {
  ExternalValidationError,
  ExternalServerError,
} = require('../../utils/CustomError');
const ParseFloatNumber = require('../../utils/ParseFloatNumber');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getVendorRefunds = async (request, response) => {
  const { pageLength, cursor } = request.query;
  const status = request.query.status
    ? Array.isArray(request.query.status)
      ? request.query.status
      : [request.query.status]
    : null;


  const refundsData = await refundService.getVendorRefunds(
    request.vendorId,
    cursor ? Number.parseInt(cursor, 10) : null,
    pageLength ? Number.parseInt(pageLength, 10) : null,
    {
      fromDate: request.query.fromDate
        ? new Date(request.query.fromDate)
        : null,
      toDate: request.query.toDate ? new Date(request.query.toDate) : null,
      status,
    }
  );

  refundsData.refunds.forEach((refund) => {
    if (refund.customer && Object.keys(refund.customer).length) {
      delete refund.customerFName;
      delete refund.customerLName;
      delete refund.customerEmail;
    }
  });
  response.send({ success: true, ...refundsData });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getRefundDetails = async (request, response) => {
  const refundData = await refundService.getRefundDetails(
    request.params.refundId,
    request.vendorId
  );
  if (!refundData) {
    return response
      .status(404)
      .send({ success: false, message: 'This refund is not found' });
  }

  if (refundData.customer && Object.keys(refundData.customer).length) {
    delete refundData.customerFName;
    delete refundData.customerLName;
    delete refundData.customerEmail;
  }
  delete refundData.fees;

  response.send({
    success: true,
    refundData,
  });
};

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */

module.exports.createNewRefund = async (request, response, next) => {
  const vendorId = request.vendorId;

  const {
    card_last_four,
    customer,
    refund_amount,
    items,
    refund_verification,
    refund_notification,
    is_partial_refund,
    order_id,
    order_url,
    order_date,
  } = request.body;
  let { expiration_date } = request.body;

  if (!expiration_date) {
    expiration_date = moment().add(10, 'days').toDate();
  }

  try {
    const isLinkValid = await externalService.isEnableLinkValid(
      refund_verification.url,
      (refund_verification.method || 'get').toLowerCase()
    );
    if (!isLinkValid) {
      return next(
        new ExternalValidationError([
          'refund_verification.url does not return the correct response',
        ])
      );
    }

    const refundData = await externalService.createExternalRefund({
      vendorId,
      publicId: request.publicId,
      orderDate: order_date,
      orderId: order_id,
      isPartialRefund: is_partial_refund,
      orderUrl: order_url,
      cardLastFour: card_last_four,
      customerEmail: customer && customer.email ? customer.email : '',
      customerFName: customer && customer.first_name ? customer.first_name : '',
      customerLName: customer && customer.last_name ? customer.last_name : '',
      expirationDate: new Date(expiration_date),
      refundAmount: ParseFloatNumber(refund_amount),
      items: items.map((item) => ({
        itemId: item.item_id,
        sku: item.sku,
        itemUrl: item.item_url,
        itemImageUrl: item.item_image_url,
        displayName: item.display_name,
        orderId: item.order_id,
        returnDate: item.return_date,
        unitPrice: ParseFloatNumber(item.unit_price),
        returnQty: item.return_qty,
      })),
      refundVerification: {
        url: refund_verification.url,
        method: (refund_verification.method || 'get').toLowerCase(),
      },
      refundNotification: {
        webhookUrl: refund_notification.webhook_url,
        redirectUrl: refund_notification.redirect_url,
        redirectMethod: (
          refund_notification.redirect_method || 'post'
        ).toLowerCase(),
      },
    });

    if (refundData) {
      return response.json({
        refund_created: true,
        refund_link: refundData.refundLink,
        refund_id: refundData.id,
        active_until: refundData.expirationDate,
      });
    }

    return next(
      new ExternalValidationError([
        "There's already a refund request made to this product, order from this vendor, and it is not due yet or refunded. Please wait until it's refunded or it become canceled.",
      ])
    );
  } catch (err) {
    console.log(err);
    return next(new ExternalServerError());
  }
};

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.sendRefundEmail = async (request, response, next) => {
  const refundId = request.params.refundId;

  try {
    await externalService.sendRefundEmail(request.vendorId, refundId);

    return response.json({
      email_sent: true,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.cancelRefund = async (request, response, next) => {
  const refundId = request.params.refundId;

  try {
    await externalService.cancelRefund(refundId, request.vendorId);
    return response.json({
      success: true,
      canceled: true,
    });
  } catch (err) {
    return next(new ExternalValidationError([err.message]));
  }
};
/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.trackEmailOpened = async (request, response, next) => {
  response.sendFile(path.join(__dirname, '../../', 'assets', 'empty_img.png'));

  try {
    const refundId = request.params.refundId;
    await refundService.markRefundEmailOpened(refundId);
  } catch (err) {
    next(err);
  }
};
