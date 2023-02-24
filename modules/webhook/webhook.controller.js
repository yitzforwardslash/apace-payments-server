const express = require('express');
const crypto = require('crypto');
const {
  updateRefundAfterACK,
  sendFailureEmail,
  getRefundByTransaction
} = require('../vendor/refund/refund.service');
const logger = require('../../utils/Logger');
const { createRefundWebhookEventAndPublish } = require('../refundWebhookEvent/refundWebhookEvent.service');

const EVENT_TOPIC_TO_STATUS = {
  customer_bank_transfer_cancelled: 'failed',
  customer_bank_transfer_failed: 'failed',
  customer_transfer_cancelled: 'failed',
  customer_transfer_failed: 'failed',
  customer_bank_transfer_completed: 'processed',
  customer_transfer_completed: 'processed',
};

Object.freeze(EVENT_TOPIC_TO_STATUS);

/**
 * @param {String} eventName
 * @returns {Boolean}
 */
const isTransactionEvent = (eventName) =>
  Object.keys(EVENT_TOPIC_TO_STATUS).includes(eventName.toLowerCase());

const verifyGatewaySignature = (remoteSignature, body) => {
  const hash = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(remoteSignature),
    Buffer.from(hash)
  );
};
/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports = async (request, response) => {
  const dwollaTopic = request.headers['x-dwolla-topic'];
  if (
    isTransactionEvent(dwollaTopic) &&
    verifyGatewaySignature(
      request.headers['x-request-signature-sha-256'],
      JSON.stringify(request.body)
    )
  ) {
    const transactionLink = request.body._links.resource.href;
    updateRefundAfterACK(
      transactionLink,
      EVENT_TOPIC_TO_STATUS[dwollaTopic]
    ).then(() => {
      logger.info('Updated the transaction status', transactionLink)

      if (EVENT_TOPIC_TO_STATUS[dwollaTopic] === 'processed') {
        getRefundByTransaction(transactionLink)
          .then(refund => {
            if (refund.refundNotification) {
              // refundWebhook([refund.id])
              createRefundWebhookEventAndPublish(refund.id);
            }
          })
      }
    }
    );
    if (EVENT_TOPIC_TO_STATUS[dwollaTopic] === 'failed') {
      // Send failure email
      await sendFailureEmail({ transaction: transactionLink });
    }
  }

  response.sendStatus(200);
};
