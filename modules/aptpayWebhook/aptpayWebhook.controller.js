const express = require('express');
const aptpayWebhookService = require('./aptpayWebhook.service');

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.handleWebhook = async (request, response, next) => {
  const { entity } = request.body;
  let success = false;

  try {
    if (entity == 'payee') {
      result = await aptpayWebhookService.handlePayeeAction(request.body);
    } else if (entity == 'disbursement') {
      result = await aptpayWebhookService.handleDisbursementAction(
        request.body
      );
    }
    return response.status(200).send('OK');
  } catch (err) {
    next(err);
  }
};
