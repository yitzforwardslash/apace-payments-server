const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);
const logger = require('../../utils/Logger');
const { generateInvoices, payInvoice } = require('../../modules/invoice/invoice.service');

module.exports = () =>
  currentChannel.then(async (channel) => {
    logger.info(`Consumer pay vendor invoice is running successfully`);
    channel.assertQueue('pay-vendor-invoice', { durable: true });

    channel.consume(`pay-vendor-invoice`, async (message) => {
      const messageContent = JSON.parse(message.content.toString());
      if (!messageContent || !messageContent.vendorId || !messageContent.invoiceId) {
        channel.ack(message);
      }
      const { vendorId, invoiceId } = messageContent;
      console.log('RBMQ pay invoice for ', invoiceId);

      try {
        await payInvoice(invoiceId, vendorId);
        console.log("Paid invoice")
      } catch (error) {
        logger.error(
          'Failed to pay vendor status',
          invoiceId,
          error
        );
      } finally {
        channel.ack(message);
      }
    });
  });
