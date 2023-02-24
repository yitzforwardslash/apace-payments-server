const {
  webhookEvent: WebhookEvent,
  webhookSubscription: WebhookSubscription,
} = require('../../prisma/prismaClient');
const webhookPublisher = require('../../message-broker/publishers/webhook');
const { MAXIMUM_TRIALS } = require('../../utils/Constants');
/**
 * Whenever a refund status is marked as complete:
 * 1- create a webhook event for it (n)
 * 2- Publish a message with that webhook eventId, vendorId
 */

/**
 * @param {String} refundId
 * @param {String} vendorId
 */
module.exports.createWebhookEventAndPublish = async (refundId, vendorId) => {
  const vendorSubscriptions = await WebhookSubscription.findMany({
    where: { vendorId },
  });
  if (vendorSubscriptions.length === 0) {
    return;
  }
  const webhookEvents = await Promise.all(
    vendorSubscriptions
      .filter((vendorSubscription) => vendorSubscription.enabled)
      .map((subscription) =>
        WebhookEvent.create({
          data: { refundId, subscriptionId: subscription.id },
        }).catch((error) => {
          return;
        })
      )
  );
  webhookPublisher(
    vendorId,
    webhookEvents.filter(Boolean).map((event) => event.id)
  );
};

module.exports.getWebhookEventDetails = (eventId) =>
  WebhookEvent.findUnique({
    where: { id: eventId },
    include: {
      refund: {
        select: {
          refundDate: true,
          agreementDate: true,
          termsDate: true,
          orderId: true,
          productId: true,
          id: true,
          customer: {
            select: { firstName: true, lastName: true, email: true },
          },
          status: true,
        },
      },
      subscription: { select: { url: true, key: true } },
    },
  });

/**
 * @param {Number} eventId
 * @returns {Promise}
 */
module.exports.markWebhookSent = (eventId) =>
  WebhookEvent.update({
    where: { id: eventId },
    data: { sent: true, trials: { increment: 1 }, lastTrialAt: new Date() },
  });

/**
 * @param {Number} eventId
 * @returns {Promise}
 */
module.exports.markWebhookFailed = (eventId) =>
  WebhookEvent.update({
    where: { id: eventId },
    data: { trials: { increment: 1 }, lastTrialAt: new Date() },
  });

module.exports.getFailedEvents = () => {
  const before30Minutes = new Date();
  before30Minutes.setMinutes(before30Minutes.getMinutes() - 30);
  return WebhookEvent.findMany({
    where: {
      sent: false,
      trials: { lt: MAXIMUM_TRIALS },
      lastTrialAt: { lte: before30Minutes },
    },
    select: { id: true, subscription: { select: { vendorId } } },
  }).then((events) => {
    const vendorToEvents = {};
    events.forEach(({ id: eventId, subscription: { vendorId } }) =>
      vendorToEvents[vendorId]
        ? vendorToEvents[vendorId].push(eventId)
        : (vendorToEvents[vendorId] = [eventId])
    );
  });
};

/**
 * @param {Date} date any event before it will be deleted
 * @returns {Promise<Number>}
 */
module.exports.deleteOldEvents = (date) =>
  WebhookEvent.deleteMany({ where: { lastTrialAt: { lte: date } } }).then(
    (deletedResult) => deletedResult.count
  );
