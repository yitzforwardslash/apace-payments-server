const { body, param, query } = require('express-validator');
const validateRequest = require('../../../middlewares/validateRequest');

const validateGetRefundData = [
  param('vendorId')
    .isString()
    .withMessage('Please provide a string for vendorId'),
  param('refundId')
    .isString()
    .withMessage('Please provide a string for refundId'),
  validateRequest,
];

const validateNewRefund = [
  param('vendorId')
    .isString()
    .withMessage('Please provide a string for vendorId'),
  body('productIds')
    .isArray()
    .withMessage('Please provide valid array of strings for productIds'),
  body('orderId')
    .isString()
    .withMessage('Please provide a valid string for orderId'),
  body('cardLastFour')
    .isInt()
    .withMessage('Please provide an integer for cardLastFour'),
  body('amount')
    .isNumeric({ no_symbols: true })
    .custom((value) => {
      if (Number.parseFloat(value) === 0) {
        return false;
      }
      return true;
    })
    .withMessage('Please provide a valid number for amount'),
  validateRequest,
];

const valdiateVerifyDebt = [
  param('vendorId')
    .isString()
    .withMessage('Please provide a string for vendorId'),
  validateRequest,
];

const validateVerifyCredit = [
  param('vendorId')
    .isString()
    .withMessage('Please provide a string for vendorId'),
  body('cardNumber')
    .isCreditCard()
    .withMessage('Please provide a valid credit card number'),
  body('expirationYear')
    .isInt()
    .withMessage('Please provide a valid expiration year'),
  body('expirationMonth')
    .isInt()
    .withMessage('Please provide a valid expiration month'),
  validateRequest,
];

const validateProcess = [
  param('vendorId')
    .isString()
    .withMessage('Please provide a string for vendorId'),
  body('cardId')
    .isInt()
    .withMessage('Please provide a valid cardId'),
  body('agreementDate').isString().withMessage('Please provide agreementDate'),
  body('termsDate').isString().withMessage('Please provide termsDate'),
  validateRequest,
];

const validateAddBank = [
  param('vendorId')
    .isString()
    .withMessage('Please provide a string for vendorId'),
  body('publicToken')
    .isString()
    .withMessage('Please provide a valid public token'),
  body('accountId')
    .isString('')
    .withMessage('Please provide a valid accountId'),
  validateRequest,
];

const validateGetRefunds = [
  query('pageLength')
    .if(query('pageLength').exists())
    .isInt({ min: 1, max: 50 })
    .withMessage('Please provide a valid page length between 1 and 50'),
  query('cursor')
    .if(query('cursor').exists())
    .isInt()
    .withMessage('Please provde a valid cursor'),
  validateRequest,
];

const validateGetRefund = [
  param('vendorId').isString().withMessage('Please provide a valid vendor id'),
  param('refundId').isString().withMessage('Please provide a valid refund id'),
  validateRequest,
];

module.exports = {
  validateNewRefund,
  valdiateVerifyDebt,
  validateGetRefundData,
  validateProcess,
  validateVerifyCredit,
  validateAddBank,
  validateGetRefunds,
  validateGetRefund,
};
