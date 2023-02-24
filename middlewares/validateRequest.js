const express = require('express');
const { validationResult } = require('express-validator');

/**
 * Check that all validation rules are met
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports = (request, response, next) => {
  const errors = validationResult(request);
  if (errors.isEmpty()) {
    return next();
  }
  return response.status(400).send(errors);
};
