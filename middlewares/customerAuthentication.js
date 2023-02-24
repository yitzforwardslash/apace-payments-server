const express = require('express');
const customErrors = require('../utils/CustomError');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {
  getCustomerEmailOrPhone,
} = require('../modules/customer/customer.service');
const getRequestIp = require('../utils/GetRequestIP');

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
    const { email, phone, key, refundId } = jwt.verify(
      jwtToken,
      process.env.JWT_SECRET
    );
    if ((!email && !phone) || !key) {
      return next(new customErrors.MalformedJWTError());
    }

    const customerData = await getCustomerEmailOrPhone(email || phone);
    if (customerData) {
      customerData.email = customerData.email.toLowerCase();
      request.customer = customerData;
    }
    request.customerEmail = email ? email.toLowerCase() : null;
    request.customerPhone = phone;
    request.refundId = refundId;
    next();
  } catch {
    next(new customErrors.MalformedJWTError());
  }
};

/**
 * @param {express.Request} request
 * @param {String} key
 * @returns {Promise<Boolean>} if using same ip or not
 */
const validateRequestIp = async (request, key) => {
  const customerIp = getRequestIp(request);
  return await bcrypt.compare(customerIp, key);
};
