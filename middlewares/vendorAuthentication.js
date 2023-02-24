const express = require('express');
const { validateVendorToken } = require('../modules/vendor/vendor.service');
const RequestLimiterClass = require('../utils/Limiter');
const vendorAuthLimiter = new RequestLimiterClass(3, 5 * 60, 3 * 60);
const getRequestIP = require('../utils/GetRequestIP');

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports = async (request, response, next) => {
  const requestIp = getRequestIP(request);
  if (!vendorAuthLimiter.canRetry(requestIp)) {
    return response.status(429).send({
      success: false,
      message: 'Too many wrong auth requests, please wait before retrying',
    });
  }
  const authorization = request.get('authorization');
  let token;
  if (
    authorization &&
    authorization.toLocaleLowerCase().startsWith('bearer ')
  ) {
    token = authorization.substring(7);
  } else {
    vendorAuthLimiter.addTrial(requestIp);
    return response
      .status(401)
      .send({ success: false, message: 'Not authorized vendor' });
  }
  const [vendorPublicId, vendorApiKey] = token.split('/');
  const vendorRouteId = request.params.vendorId;

  const isValidKey = await validateVendorToken(
    vendorRouteId,
    vendorPublicId,
    vendorApiKey
  );
  if (isValidKey) {
    request.vendorId = vendorRouteId;
    return next();
  }
  vendorAuthLimiter.addTrial(requestIp);
  response.status(401).send({ success: false, message: 'Not valid api key' });
};
