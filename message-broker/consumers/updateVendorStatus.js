const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);
const { updateVendorStatus } = require('../../modules/vendor/vendor.service');
const logger = require('../../utils/Logger');

module.exports = () =>
  currentChannel.then(async (channel) => {
    logger.info(`Consumer update vendor status is running successfully`);
    channel.consume(`update-vendor-status`, async (message) => {
      const messageContent = JSON.parse(message.content.toString());
      if (!messageContent || !messageContent.vendorId) {
        channel.ack(message);
      }
      try {
        // await updateVendorStatus(messageContent.vendorId);
      } catch (error) {
        logger.error(
          'Failed to update vendor status',
          messageContent.vendorId,
          error
        );
      } finally {
        channel.ack(message);
      }
    });
  });
