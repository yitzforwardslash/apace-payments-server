const RabbitMQ = require('../../utils/RabbitMQ');
const currentChannel = RabbitMQ.then((connection) =>
  connection.createChannel()
);

/**
 *
 * @param {Array<Number>} webhookEvents
 * @returns
 */
module.exports = (webhookEvents) =>
  currentChannel.then((channel) =>
    webhookEvents.map((refundWebhookEventId) =>
      channel.sendToQueue(
        `refund-webhook-vendor`,
        Buffer.from(JSON.stringify({ refundWebhookEventId })),
        { persistent: true }
      )
    )
  );
