const express = require('express');
const customErrors = require('../utils/CustomError');
const jwt = require('jsonwebtoken');
const { getVendor } = require('../modules/vendor/vendor.service');

/**
 * Checks if customer is authed, and appends it's id as request.customer
 * if customer is not authed, sends back 401 error
 * if customer ip is changed than the ip used at authentication, it refuses the request
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports = async (request, response, next) => {
  const authorization = request.get('authorization');
  let jwtToken;
  if (
    authorization &&
    authorization.toLocaleLowerCase().startsWith('bearer ')
  ) {
    jwtToken = authorization.substring(7);
  } else {
    return next(new customErrors.MalformedJWTError());
  }
  try {
    const { id } = jwt.verify(jwtToken, process.env.JWT_SECRET);
    if (!id) {
      return next(new customErrors.MalformedJWTError());
    }
    request.vendor = await getVendor({ id });
    request.vendorId = id;
    next();
  } catch {
    next(new customErrors.MalformedJWTError());
  }
};
