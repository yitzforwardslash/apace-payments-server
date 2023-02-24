const { param, query } = require('express-validator');
const validateRequest = require('../../middlewares/validateRequest');

const validateHasInvoiceId = [
  param('invoiceId').isInt().withMessage('Please provide a valid invoice id'),
  validateRequest,
];

const validateInvoiceStats = [
  query('select')
    .optional({ nullable: true })
    .isIn(['due'])
    .withMessage(
      'Please provide a valide selection. Valid selections: ["due"]'
    ),
  query('startDate')
    .optional({ nullable: true })
    .isDate()
    .withMessage('Please provide a valid starting date.'),
  query('endDate')
    .optional({ nullable: true })
    .isDate()
    .withMessage('Please provide a valid ending date.'),
  validateRequest,
];

module.exports = { validateHasInvoiceId, validateInvoiceStats };
