const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);

/**
 *
 * @param {String} vendorId
 * @returns
 */
module.exports = (vendorId, invoiceId) =>
  currentChannel.then((channel) =>
    channel.sendToQueue(
      `pay-vendor-invoice`,
      Buffer.from(JSON.stringify({ vendorId, invoiceId })),
      { persistent: true }
    )
  );
