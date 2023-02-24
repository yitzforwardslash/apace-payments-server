const { response } = require('express');
const express = require('express');
const subscriptionService = require('./webhookSubscription.service');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.createNewSubscription = async (request, response, next) => {
  try {
    const webhook = await subscriptionService.addNewSubscription(
      request.vendorId,
      request.body.url,
      request.body.key
    );
    if (webhook) {
      return response.send({ success: true, subscriptionId: webhook.id });
    }
    response.status(400).send({
      success: false,
      message: 'You have exceeded the maximum number of allowed webhooks',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getSubscriptions = async (request, response) => {
  const vendorSubscriptions = await subscriptionService.getSubscriptions(
    request.vendorId
  );
  response.send({ success: true, subscriptions: vendorSubscriptions });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.disableSubscription = async (request, response) => {
  const disabledSubscription = await subscriptionService.disableEnableSubscription(
    Number.parseInt(request.params.subscriptionId, 10),
    false
  );
  if (disabledSubscription) {
    return response.send({
      success: true,
      message: 'This webhook subscription has been disabled successfully',
    });
  }
  response.status(404).send({
    success: false,
    message: 'This webhook subscription was not found',
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.enableSubscription = async (request, response) => {
  const enabledSubscription = await subscriptionService.disableEnableSubscription(
    Number.parseInt(request.params.subscriptionId, 10),
    true
  );
  if (enabledSubscription) {
    return response.send({
      success: true,
      message: 'This webhook subscription has been enabled successfully',
    });
  }
  response.status(404).send({
    success: false,
    message: 'This webhook subscription was not found',
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.deleteSubscription = async (request, response) => {
  const isDeleted = await subscriptionService.deleteSubscription(
    Number.parseInt(request.params.subscriptionId)
  );
  if (isDeleted) {
    return response.send({
      success: true,
      message: 'This webhook subscription was deleted successfully',
    });
  }
  response.status(404).send({
    success: false,
    message: 'This webhook subscription was not found',
  });
};
