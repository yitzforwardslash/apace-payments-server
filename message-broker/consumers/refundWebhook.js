const { default: axios } = require('axios');
const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);
const {
  getRefundWebhookEventDetails,
  markRefundWebhookSent,
  markRefundWebhookFailed,
} = require('../../modules/refundWebhookEvent/refundWebhookEvent.service');
const MAXIMUM_TRIALS = 4;
const logger = require('../../utils/Logger');
const { signMessage } = require('../../utils/HmacSignature');

const generateWebhookBody = (eventDetails) => ({
  refund_id: eventDetails.refund.id,
  refund_success: eventDetails.refund.status == 'processed',
  date_created: eventDetails.refund.createdAt,
  datetime_refund_sent: eventDetails.refund.refundDepositedAt,
  apace_refund_link: `${process.env.APACE_VENDOR_REFUND_URL}/${eventDetails.refund.id}`,
  order_id: eventDetails.refund.orderId,
  item_ids: eventDetails.refund.productIds,
  refund_card: `**** **** ***** ${eventDetails.refund.customerCard.lastFour}`,
  network: eventDetails.refund.customerCard.network,
  network_transaction_id: eventDetails.refund.transaction.transactionId,
});

const canSend = (eventDetails) =>
  eventDetails && eventDetails.trials < MAXIMUM_TRIALS && !eventDetails.sent;

module.exports = () =>
  currentChannel.then(async (channel) => {
    logger.info(`Consumer refund-webhook-vendor is running successfully`);
    channel.consume(`refund-webhook-vendor`, async (message) => {
      const messageContent = JSON.parse(message.content.toString());
      if (!messageContent || !messageContent.refundWebhookEventId) {
        return channel.ack(message);
      }
      const eventDetails = await getRefundWebhookEventDetails(
        messageContent.refundWebhookEventId
      );
      if (!canSend(eventDetails)) {
        return channel.ack(message);
      }
      const webhookBody = generateWebhookBody(eventDetails);
      const messageSignature = eventDetails.refund.vendorToken
        ? signMessage(webhookBody, eventDetails.refund.vendorToken.secret)
        : '';
      logger.info('Sending webhook', webhookBody, eventDetails);
      try {
        const headers = {};
        if (messageSignature) {
          headers['x-request-signature-sha-256'] = messageSignature;
        }
        const { status, data } = await axios.post(
          eventDetails.refund.refundNotification.webhookUrl,
          webhookBody,
          {
            headers,
          }
        );
        if (status < 300) {
          await markRefundWebhookSent(messageContent.refundWebhookEventId);
          logger.info(
            'Successfully sent webhook',
            messageContent.refundWebhookEventId
          );
        } else {
          await markRefundWebhookFailed(messageContent.refundWebhookEventId);
          logger.error(
            'Failed to send webhook',
            messageContent.refundWebhookEventId,
            status,
            data
          );
        }
      } catch (error) {
        await markRefundWebhookFailed(messageContent.refundWebhookEventId);
        logger.error(
          'Failed to send webhook',
          messageContent.refundWebhookEventId,
          error
        );
      } finally {
        channel.ack(message);
      }
    });
  });
