const express = require('express');
const {
  getVendorByRefundId,
} = require('../modules/vendor/vendor.service');

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports = async (request, response, next) => {
  const vendor = await getVendorByRefundId(request.refundId);

  if (vendor) {
    request.vendorId = vendor.id;
  }

  return next();
};
