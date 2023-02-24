const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);

/**
 *
 * @param {String} vendorId
 * @param {Array<Number>} webhookEvents
 * @returns
 */
module.exports = (vendorId, webhookEvents) =>
  currentChannel.then((channel) =>
    webhookEvents.map((webhookEventId) =>
      channel.sendToQueue(
        `webhook-vendor-${vendorId}`,
        Buffer.from(JSON.stringify({ webhookEventId })),
        { persistent: true }
      )
    )
  );
