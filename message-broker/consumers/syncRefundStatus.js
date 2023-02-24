const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);
const logger = require('../../utils/Logger');
const refundService = require('../../modules/vendor/refund/refund.service')

module.exports = () =>
  currentChannel.then(async (channel) => {
    logger.info(`Consumer sync-refund-status is running successfully`);
    channel.consume(`sync-refund-status`, async (message) => {
      const messageContent = JSON.parse(message.content.toString());
      if (!messageContent || !messageContent.refundId) {
        return channel.ack(message);
      }
      const { refundId } = messageContent;
      // wait for arbitrary 20 seconds and re-check refund status
      setTimeout(async () => {
        try {
          const newStatus = await refundService.syncRefundStatus(refundId);
          console.log('Re-checked status for refund', refundId, newStatus);
        } catch (err) {
          console.log(err);
        } finally {
          channel.ack(message);
        }
      }, 20 * 1000);

    });
  });
