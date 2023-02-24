const express = require('express');
const { getSecretVendorId } = require('../modules/vendor/vendor.service');
const RequestLimiterClass = require('../utils/Limiter');
const vendorAuthLimiter = new RequestLimiterClass(3, 5 * 60, 3 * 60);
const getRequestIP = require('../utils/GetRequestIP');
const portalAuthentication = require('./portalAuthentication');

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
  const secret = request.header('apace-secret');
  const publicId = request.header('apace-public-id');
  if (publicId && secret) {
    const vendorId = await getSecretVendorId(publicId, secret);
    if (vendorId) {
      request.publicId = publicId;
      request.vendorId = vendorId;
      return next();
    }
  }
  
  const authorization = request.get('authorization');
  if (authorization){
    return portalAuthentication(request, response, next);
  }

  vendorAuthLimiter.addTrial(requestIp);
  return response
    .status(401)
    .send({ success: false, message: 'Not authorized vendor, please check your api key id/secret' });
};
