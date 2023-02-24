const vendorController = require('./vendor.controller');
const getRequestIP = require('../../utils/GetRequestIP');

module.exports.signupBruteHandler = (request, response, next) => {
  if (vendorController.signupFailureLimiter.canRetry(getRequestIP(request))) {
    next();
  } else {
    response.status(429).send({
      success: false,
      message: 'Too many wrong auth requests, please wait before retrying',
    });
  }
};

module.exports.onboardpBruteHandler = (request, response, next) => {
  if (vendorController.signupFailureLimiter.canRetry(getRequestIP(request))) {
    next();
  } else {
    response.status(429).send({
      success: false,
      message: 'Too many wrong auth requests, please wait before retrying',
    });
  }
};

module.exports.loginBruteHandler = (request, response, next) => {
  if (vendorController.loginFailureLimiter.canRetry(getRequestIP(request))) {
    next();
  } else {
    response.status(429).send({
      success: false,
      message: 'Too many wrong auth requests, please wait before retrying',
    });
  }
};

module.exports.twoFactorBruteHandler = (request, response, next) => {
  if (
    vendorController.twoFactorFailureLimiter.canRetry(getRequestIP(request))
  ) {
    next();
  } else {
    response.status(429).send({
      success: false,
      message: 'Too many wrong auth requests, please wait before retrying',
    });
  }
};
