const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);

/**
 *
 * @param {String} vendorId
 * @returns
 */
module.exports = (vendorId) =>
  currentChannel.then((channel) =>
    channel.sendToQueue(
      `update-vendor-status`,
      Buffer.from(JSON.stringify({ vendorId })),
      { persistent: true }
    )
  );
