const {
  refundWebhookEvent: RefundWebhookEvent,
} = require('../../prisma/prismaClient');
const refundWebhookPublisher = require('../../message-broker/publishers/refundWebhook');
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
module.exports.createRefundWebhookEventAndPublish = async (refundId) => {
  
  const event = await RefundWebhookEvent.create({
    data: {
      refundId
    }
  })

  refundWebhookPublisher(
    [event.id]
  );
};

module.exports.getRefundWebhookEventDetails = (eventId) =>
  RefundWebhookEvent.findUnique({
    where: { id: eventId },
    include: {
      refund: {
        select: {
          refundDate: true,
          agreementDate: true,
          termsDate: true,
          orderId: true,
          productIds: true,
          id: true,
          customer: {
            select: { firstName: true, lastName: true, email: true },
          },
          customerCard: {
            select: { type: true, lastFour: true, network: true }
          },
          transaction: true,
          vendorToken: true,
          status: true,
          createdAt: true,
          refundDepositedAt: true,
          refundNotification: true,
          refundItems: true,
        },
      },
    },
  });

/**
 * @param {Number} eventId
 * @returns {Promise}
 */
module.exports.markRefundWebhookSent = (eventId) =>
  RefundWebhookEvent.update({
    where: { id: eventId },
    data: { sent: true, trials: { increment: 1 }, lastTrialAt: new Date() },
  });

/**
 * @param {Number} eventId
 * @returns {Promise}
 */
module.exports.markRefundWebhookFailed = (eventId) =>
 RefundWebhookEvent.update({
    where: { id: eventId },
    data: { trials: { increment: 1 }, lastTrialAt: new Date() },
  });

module.exports.getFailedEvents = () => {
  const before30Minutes = new Date();
  before30Minutes.setMinutes(before30Minutes.getMinutes() - 30);
  return RefundWebhookEvent.findMany({
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
  RefundWebhookEvent.deleteMany({ where: { lastTrialAt: { lte: date } } }).then(
    (deletedResult) => deletedResult.count
  );
