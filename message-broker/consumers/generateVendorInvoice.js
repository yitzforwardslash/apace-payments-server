const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);
const logger = require('../../utils/Logger');
const { generateInvoices } = require('../../modules/invoice/invoice.service');

module.exports = () =>
  currentChannel.then(async (channel) => {
    logger.info(`Consumer generate vendor invoice is running successfully`);
    channel.assertQueue('generate-vendor-invoice', { durable: true });

    channel.consume(`generate-vendor-invoice`, async (message) => {
      const messageContent = JSON.parse(message.content.toString());
      if (!messageContent || !messageContent.vendorId) {
        channel.ack(message);
      }
      console.log('RBMQ Generate invoice for ', messageContent.vendorId);

      try {
        await generateInvoices(
          messageContent.vendorId,
          messageContent.data || {}
        );
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
