const { default: axios } = require('axios');
const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);
const {
  getWebhookEventDetails,
  markWebhookSent,
  markWebhookFailed,
} = require('../../modules/webhookEvent/webhookEvent.service');
const { signMessage } = require('../../utils/HmacSignature');
const MAXIMUM_TRIALS = 4;
const logger = require('../../utils/Logger');

const generateWebhookBody = (eventDetails) => ({
  refundId: eventDetails.refundId,
  refundDate: eventDetails.refund.refundDate,
  customerName: eventDetails.refund.customer.firstName.concat(
    ' ',
    eventDetails.refund.customer.lastName
  ),
  customerEmail: eventDetails.refund.customer.email,
  agreementDate: eventDetails.refund.agreementDate,
  termsDate: eventDetails.refund.termsDate,
  refundStatus: eventDetails.status,
});

const canSend = (eventDetails) =>
  eventDetails.trials < MAXIMUM_TRIALS && !eventDetails.sent;

module.exports = (vendorId) =>
  currentChannel.then(async (channel) => {
    logger.info(`Consumer webhook-vendor-${vendorId} is running successfully`);
    channel.consume(`webhook-vendor-${vendorId}`, async (message) => {
      const messageContent = JSON.parse(message.content.toString());
      if (!messageContent || !messageContent.webhookEventId) {
        channel.ack(message);
      }
      const eventDetails = await getWebhookEventDetails(
        messageContent.webhookEventId
      );
      if (!canSend(eventDetails)) {
        channel.ack(message);
      }
      const webhookBody = generateWebhookBody(eventDetails);
      const messageSignature = signMessage(
        webhookBody,
        eventDetails.subscription.key
      );
      try {
        const { status, data } = await axios.post(
          eventDetails.subscription.url,
          webhookBody,
          {
            headers: { 'x-request-signature-sha-256': messageSignature },
          }
        );
        if (status < 300) {
          await markWebhookSent(messageContent.webhookEventId);
          logger.info(
            'Successfully sent webhook',
            messageContent.webhookEventId
          );
        } else {
          await markWebhookFailed(messageContent.webhookEventId);
          logger.error(
            'Failed to send webhook',
            messageContent.webhookEventId,
            status,
            data
          );
        }
      } catch (error) {
        await markWebhookFailed(messageContent.webhookEventId);
        logger.error(
          'Failed to send webhook',
          messageContent.webhookEventId,
          status,
          data,
          error
        );
      } finally {
        channel.ack(message);
      }
    });
  });
