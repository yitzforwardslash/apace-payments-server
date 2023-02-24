const express = require('express');
const { getVendor } = require('../modules/vendor/vendor.service');
const { DisabledVendorError } = require('../utils/CustomError');

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports = async (request, response, next) => {
  const vendor = await getVendor({ id: request.vendorId });

  if (process.env.NODE_ENV === 'production' && vendor.status !== 'ACTIVE') {
    return next(new DisabledVendorError());
  }

  return next();
};
