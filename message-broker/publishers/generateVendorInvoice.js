const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);

/**
 *
 * @param {String} vendorId
 * @returns
 */
module.exports = (vendorId, data) =>
  currentChannel.then((channel) =>
    channel.sendToQueue(
      `generate-vendor-invoice`,
      Buffer.from(JSON.stringify({ vendorId, data })),
      { persistent: true }
    )
  );
