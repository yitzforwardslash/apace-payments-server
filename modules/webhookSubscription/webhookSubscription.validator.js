const { body, param } = require('express-validator');
const validateRequest = require('../../middlewares/validateRequest');

const validateCreateSubscription = [
  body('url').isURL().withMessage('Please provide a valid URL'),
  body('key')
    .isStrongPassword({ minLength: 6 })
    .withMessage('Please provide at least 6 characters key'),
  validateRequest,
];

const validateHasId = [
  param('subscriptionId')
    .isNumeric()
    .withMessage('Please provide a valid subscriptionId'),
  validateRequest,
];

module.exports = {
  validateCreateSubscription,
  validateHasId,
};
