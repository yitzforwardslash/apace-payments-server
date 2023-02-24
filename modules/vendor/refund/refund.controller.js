const express = require('express');
const cardLookup = require('binlookup')();
const refundService = require('./refund.service');
const moment = require('moment');
const SendGrid = require('../../../utils/SendGrid');
const { generateRefundToken } = require('./refund.utils');
const { NoRtpSupport } = require('../../../utils/CustomError');
const Plaid = require('../../../utils/Plaid');
const logger = require('../../../utils/Logger');
const {
  createRefundWebhookEventAndPublish,
} = require('../../refundWebhookEvent/refundWebhookEvent.service');
const syncRefundStatus = require('../../../message-broker/publishers/syncRefundStatus');
const customerService = require('../../customer/customer.service');
const vendorService = require('../../vendor/vendor.service');
const AptPay = require('../../../utils/AptPay');
const { REFUND_STEPS } = require('../../../utils/Constants');
const ParseFloatNumber = require('../../../utils/ParseFloatNumber');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getRefundData = async (request, response, next) => {
  if (!request.refundId) {
    return next();
  }

  await refundService.syncExpiredState(request.refundId);

  const refundData = await refundService.getRefund(request.refundId);
  if (!refundData || refundData === -1) {
    return response
      .status(404)
      .send({ success: false, message: 'Can not find this refund!' });
  }

  await refundService.markRefundLinkClicked(refundData.id);

  if (refundData.expired) {
    return response.status(400).send({
      success: false,
      error_code: 4006,
      vendor: refundData.vendor,
      refundItems: refundData.refundItems,
      orderDate: refundData.orderDate,
      orderId: refundData.orderId,
      orderUrl: refundData.orderUrl,
      status: refundData.status,
      expired: true,
    });
  }

  const refundEnabled = await refundService.isRefundEnabledByVendor(
    request.refundId,
    refundData.vendorId
  );

  if (
    !refundEnabled &&
    !['pending', 'processed', 'failed'].includes(refundData.status)
  ) {
    return response.status(400).send({
      success: false,
      error_code: 4005,
      vendor: refundData.vendor,
      refundItems: refundData.refundItems,
      orderDate: refundData.orderDate,
      orderId: refundData.orderId,
      orderUrl: refundData.orderUrl,
      status: refundData.status,
    });
  }

  const refundFees = await refundService.getRefundFees(refundData.vendorId);

  refundFees.percentage = ParseFloatNumber(refundFees.percentage.toString().substr(0,3))
  response.send({
    success: true,
    ...refundData,
    fees: refundFees,
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.cancelRefund = async (request, response, next) => {
  const refundData = await refundService.getRefund(request.params.refundId);

  if (!refundData || refundData === -1) {
    return response
      .status(404)
      .send({ success: false, message: 'Can not find this refund!' });
  }

  if (refundData.status === 'canceled') {
    return response
      .status(400)
      .send({ success: false, message: 'Refund is already canceled!' });
  }

  if (refundData.status === 'pending' || refundData.status === 'processed') {
    return response.status(400).send({
      success: false,
      message: 'Cannot cancel refund at current stage',
    });
  }

  const result = await refundService.cancelRefund(request.params.refundId);
  if (result.count === 1) {
    return response.status(200).send({ success: true });
  }

  return response.status(400).send({
    success: false,
    message: 'Something went wrong',
  });
};

// /**
//  * Creates a new refund for a given vendor
//  * @param {express.Request} request
//  * @param {express.Response} response
//  */
// module.exports.createNewRefund = async (request, response) => {
//   const { productIds, orderId, cardLastFour, amount } = request.body;
//   const refundData = {
//     productIds,
//     orderId,
//     cardLastFour: cardLastFour.toString(),
//     amount: 1.025,
//     // amount,
//   };
//   const addedRefundId = await refundService.createRefund(
//     refundData,
//     request.params.vendorId
//   );
//   if (addedRefundId !== -1) {
//     return response.send({
//       refundToken: generateRefundToken(addedRefundId),
//       refundId: addedRefundId,
//       success: true,
//     });
//   }
//   response.status(400).send({
//     message:
//       "There's already a refund request made to this product, order from this vendor, and it is not due yet or refunded. Please wait until it's refunded or it become canceled.",
//     success: false,
//   });
// };

/**
 * Process a given refund
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.processRefund = async (request, response, next) => {
  const { agreementDate, termsDate, cardId } = request.body;
  const vendorId = request.params.vendorId;

  try {
    new Date(agreementDate);
    new Date(termsDate);
  } catch (error) {
    return response.status(400).send({
      success: false,
      message: 'Please provide a valid date for agreementDate|termsDate',
    });
  }
  try {
    const refund = await refundService.getRefund(request.refundId);
    if (refund.lockedToCardId && refund.lockedToCardId !== cardId) {
      return response.status(400).send({
        success: false,
        message: 'Please use the card used in purchase to complete the refund',
      });
    }

    const cardOwner = await customerService.getCardOwner(cardId);
    if (cardOwner.email !== request.customer.email) {
      return response.status(400).send({
        success: false,
        message:
          'You can not transfer to a method thats attached to different customer',
      });
    }
    // verify vendor allows refund if applicable
    const refundEnabled = await refundService.canProcessRefund(
      request.refundId,
      vendorId
    );
    if (!refundEnabled) {
      return response.status(400).send({
        success: false,
        error_code: 4005,
        message:
          'The vendor is not enabling the refund, please contact your vendor or try again later.',
      });
    }

    const usedCard = await customerService.getCard(cardId);
    const { transactionStatus, refundedAmount } =
      await refundService.processTransaction(
        cardId,
        request.refundId,
        vendorId
      );
    await refundService.moveRefundTimelineToStep(
      request.refundId,
      REFUND_STEPS.RECEIVE_PAYMENT
    );

    response.send({
      success: true,
      message: 'Transaction created successfully!',
      transactionStatus,
    });

    await refundService.updateAgreement(
      request.refundId,
      agreementDate,
      termsDate,
    );

    let paymentMethod = `debit card ending in ${usedCard.lastFour}`;

    if (process.env.NODE_ENV === 'production') {
      syncRefundStatus([request.refundId]);
    }

    return await SendGrid.send({
      from: {
        email: process.env.SENDING_EMAIL_CUSTOMERS,
        name: 'Apace Payments',
      },
      templateId: process.env.SENDGRID_REFUND_SUCCESS_TEMPLATE,
      to: request.customer.email,
      dynamicTemplateData: {
        refundedAmount,
        paymentMethod,
        name: request.customer.firstName.concat(' ', request.customer.lastName),
      },
    });
  } catch (error) {
    if (error.response && error.response.data) {
      console.dir({ data: error.response.data }, { depth: null });
    }
    if (error.status === 404 || error.status === 400) {
      return response.status(404).send({
        success: false,
        message: 'You sent a non-existing funding source.',
      });
    }
    next(error);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getVendorRefunds = async (request, response) => {
  const { pageLength, cursor } = request.query;
  const vendor = await vendorService.getVendor({ id: request.vendorId });
  const refundsData = await refundService.getVendorRefunds(
    request.vendorId,
    cursor ? Number.parseInt(cursor, 10) : null,
    pageLength ? Number.parseInt(pageLength, 10) : null,
    {
      fromDate: request.query.fromDate
        ? new Date(request.query.fromDate)
        : null,
      toDate: request.query.toDate ? new Date(request.query.toDate) : null,
      status: vendor.refundListStatuses,
    }
  );

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

  response.send({
    success: true,
    refundData,
  });
};
