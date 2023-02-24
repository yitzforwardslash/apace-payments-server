const express = require('express');
const { isVendorDisabled } = require('../modules/vendor/vendor.service');
const { DisabledVendorError } = require('../utils/CustomError');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports = async (request, response, next) => {
  const vendorDisabled = await isVendorDisabled(request.refundId);
  if (vendorDisabled) {
    next(new DisabledVendorError());
  }
  next();
};
