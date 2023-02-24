const express = require('express');
const logger = require('../utils/Logger');
const customErrors = require('../utils/CustomError');

/**
 * Handles errors
 * @param {Error} error
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports = (error, request, response, next) => {
  if (error instanceof customErrors.NotUniqueError) {
    return response.status(400).send({
      message: `${error.value
        } is a previously used ${error.field.toLowerCase()}`,
      success: false,
    });
  }
  if (error instanceof customErrors.NotFoundError) {
    return response
      .status(404)
      .send({ message: `This ${error.field} is not found!!`, success: false });
  }
  if (error instanceof customErrors.MalformedJWTError) {
    return response.status(401).send({
      message:
        'The JWT token that you are using is either expired, or has been edited!!!',
      success: false,
    });
  }
  if (error instanceof customErrors.ExpiredRefundError) {
    return response.status(410).send({
      success: false,
      message: 'This refund has already either expired or refunded before!!',
    });
  }
  if (error instanceof customErrors.DisabledVendorError) {
    return response.status(400).send({
      success: false,
      message: `This vendor has been disabled, please ask him to contact Apace`,
    });
  }
  if (error instanceof customErrors.ExternalValidationError) {
    return response.status(400).send({
      refund_created: false,
      errors: error.errors.map(msg => ({ error_code: 5001, error_message: msg }))
    })
  }
  if (error instanceof customErrors.ExternalInvalidEmailError) {
    return response.status(400).send({
      email_sent: false,
      errors: { error_code: 4012, error_message: "The refund does not have customer email associated with it"}
    })
  }
  if (error instanceof customErrors.ExternalServerError) {
    return response.status(500).send({
      refund_created: false,
      errors: [{
        error_code: 5010,
        error_message: 'Server error'
      }]
    })
  }
  logger.error(error);
  response.status(500).send({ message: error.message || "Something went wrong" });
};
