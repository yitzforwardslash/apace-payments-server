const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);

/**
 *
 * @param {Array<String>} refundIds
 * @returns
 */
module.exports = (refundIds) =>
  currentChannel.then((channel) =>
    refundIds.map((refundId) =>
      channel.sendToQueue(
        `sync-refund-status`,
        Buffer.from(JSON.stringify({ refundId })),
        { persistent: true }
      )
    )
  );
