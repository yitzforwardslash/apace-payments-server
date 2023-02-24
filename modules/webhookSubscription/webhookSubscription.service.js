const {
  webhookSubscription: WebhookSubscription,
  vendor: Vendor,
} = require('../../prisma/prismaClient');
const {
  CustomErrorHandler,
  NotUniqueError,
} = require('../../utils/CustomError');
const MAXIMUM_SUBSCRIPTIONS = 2;
const logger = require('../../utils/Logger');

/**
 * @param {String} vendorId
 * @param {String} url
 * @param {String} key
 * @returns {Promise<String>}
 */
module.exports.addNewSubscription = (vendorId, url, key) =>
  Vendor.update({
    where: { id: vendorId },
    data: { webhookSubscriptions: { create: { url, key } } },
    include: { webhookSubscriptions: true },
  })
    .then(async ({ webhookSubscriptions }) => {
      if (webhookSubscriptions.length > MAXIMUM_SUBSCRIPTIONS) {
        const toBeRemovedWebhook =
          webhookSubscriptions[webhookSubscriptions.length - 1];
        await Vendor.update({
          where: { id: vendorId },
          data: {
            webhookSubscriptions: { disconnect: { id: toBeRemovedWebhook.id } },
          },
        });
        return false;
      }
      return webhookSubscriptions[webhookSubscriptions.length - 1];
    })
    .catch((error) => {
      if (CustomErrorHandler.isNotUniqueError(error)) {
        throw new NotUniqueError('url', url);
      } else {
        logger.error(error);
        return false;
      }
    });

/**
 * @param {String} vendorId
 * @returns {Promise<Array>}
 */
module.exports.getSubscriptions = (vendorId) =>
  WebhookSubscription.findMany({ where: { vendorId } });

/**
 *
 * @param {Number} subscriptionId
 * @param {Boolean} enabled
 * @returns
 */
module.exports.disableEnableSubscription = (subscriptionId, enabled) =>
  WebhookSubscription.update({
    where: { id: subscriptionId },
    data: { enabled },
  }).catch((error) => {
    if (CustomErrorHandler.isNotFoundError(error)) {
      return false;
    } else {
      logger.error(error);
      return false;
    }
  });

/**
 *
 * @param {Number} subscriptionId
 * @returns {Promise<Boolean>}
 */
module.exports.deleteSubscription = (subscriptionId) =>
  WebhookSubscription.delete({
    where: { id: subscriptionId },
  }).catch((error) =>
    CustomErrorHandler.isNotFoundError(error) ? null : logger.error(error)
  );
