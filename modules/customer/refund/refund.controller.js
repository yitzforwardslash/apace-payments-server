const express = require('express');
const refundService = require('./refund.service');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getRefunds = async (request, response, next) => {
  let statuses = [];
  if (request.query.status) {
    if (typeof request.query.status === 'string') {
      statuses.push(request.query.status);
    } else if (Array.isArray(request.query.status)) {
      statuses = request.query.status;
    }
  }

  const refunds = await refundService.getRefunds({
    customerEmail: request.customerEmail,
    customerPhone: request.customerPhone,
    statuses,
  });

  return response.send(refunds);
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getStats = async (request, response, next) => {
  const stats = await refundService.getStats({
    customerEmail: request.customerEmail,
    customerPhone: request.customerPhone,
  });
  return response.send(stats);
};


/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getRefundDetails = async (request, response, next) => {
 const refundId = request.params.refundId

  const refund = await refundService.getRefundDetails({
    customerEmail: request.customerEmail,
    customerPhone: request.customerPhone,
    refundId,
  });

  return response.send(refund);
};
