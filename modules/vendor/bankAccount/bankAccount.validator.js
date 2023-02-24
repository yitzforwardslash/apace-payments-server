const { body } = require('express-validator');
const validateRequest = require('../../../middlewares/validateRequest');

const validateAddBankAccount = [
  body('name').isString().withMessage('Please provide a valid string for name'),
  body('routingNumber')
    .isString()
    .isLength({min: 9, max: 9})
    .withMessage('Please provide a valid string for routingNumber with 9 digits'),
  body('accountNumber')
    .isString()
    .isLength({min: 9, max: 10})
    .withMessage('Please provide a valid string for accountNumber with 9-10 digits'),
  validateRequest,
];

const validateUpdateDefaultBankAccount = [
    body('bankAccountId').isInt().withMessage('Please provide a valid bank account id'),
    validateRequest,
]

module.exports = {
  validateAddBankAccount,
  validateUpdateDefaultBankAccount
};
