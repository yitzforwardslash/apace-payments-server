const express = require('express');
const customErrors = require('../utils/CustomError');
const jwt = require('jsonwebtoken');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports = (strict) => async (request, response, next) => {
  const authorization = request.get('authorization');
  let jwtToken;
  if (
    authorization &&
    authorization.toLocaleLowerCase().startsWith('bearer ')
  ) {
    jwtToken = authorization.substring(7);
    try {
      const { refundId } = jwt.verify(jwtToken, process.env.JWT_SECRET);
      if (!refundId) {
        return next();
      }
      request.refundId = refundId;
      next();
    } catch (err) {
      if (strict) {
        return next(new customErrors.MalformedJWTError());
      }
      return next();
    }
  } else if (strict) {
    return next(new customErrors.MalformedJWTError());
  } else {
    return next();
  }
};
