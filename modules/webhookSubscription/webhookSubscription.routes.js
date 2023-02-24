const router = require('express').Router({ mergeParams: true });
const vendorAuthentication = require('../../middlewares/vendorAuthentication');
const subscriptionValidator = require('./webhookSubscription.validator');
const subscriptionController = require('./webhookSubscription.controller');

// Get all subscriptions
router.get('/', vendorAuthentication, subscriptionController.getSubscriptions);

// Add subscription
router.post(
  '/',
  vendorAuthentication,
  subscriptionValidator.validateCreateSubscription,
  subscriptionController.createNewSubscription
);

// Disable specific subscription
router.post(
  '/:subscriptionId/disable',
  vendorAuthentication,
  subscriptionValidator.validateHasId,
  subscriptionController.disableSubscription
);

// Enable specific subscription
router.post(
  '/:subscriptionId/enable',
  vendorAuthentication,
  subscriptionValidator.validateHasId,
  subscriptionController.enableSubscription
);

// Delete subscription
router.delete(
  '/:subscriptionId',
  vendorAuthentication,
  subscriptionValidator.validateHasId,
  subscriptionController.deleteSubscription
);

module.exports = router;
