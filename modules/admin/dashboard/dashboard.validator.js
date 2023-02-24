const { query, param, body } = require('express-validator');
const validateRequest = require('../../../middlewares/validateRequest');

const validateDateRangeParams = [
  query('from')
    .optional({ nullable: true })
    .isDate()
    .withMessage('Please provide a valid from date, use this form: YYYY-MM-DD'),
  query('to')
    .optional({ nullable: true })
    .isDate()
    .withMessage('Please provide a valid from date, use this form: YYYY-MM-DD'),
  validateRequest,
];

const validateContainsIdParam = [
  param('id').exists().isString().withMessage('Please provide a valid id'),
  validateRequest,
];

const validateOrderParams = [
  query('order')
    .optional()
    .isString()
    .isIn(['desc', 'asc'])
    .withMessage('Please provide a valid order direction value (desc, asc)'),
  query('orderBy')
    .optional()
    .isString()
    .withMessage('Please provide a valid order by value'),
  validateRequest,
];
const validateGenerateInvoicesForVendors = [
  body('dueDate')
    .optional({ nullable: true })
    .isISO8601().toDate()
    .withMessage('Please provide a valid dueDate, use this form: YYYY-MM-DD'),
  body('vendorIds')
    .optional()
    .isArray()
    .withMessage('Please provide a valid array for vendorIds'),
  validateRequest,
];

module.exports = {
  validateDateRangeParams,
  validateOrderParams,
  validateContainsIdParam,
  validateGenerateInvoicesForVendors,
};
