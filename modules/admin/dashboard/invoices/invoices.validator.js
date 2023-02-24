const {body, query} = require('express-validator');
const validateRequest = require('../../../../middlewares/validateRequest');

const validateMarkInvoiceAsRead = [
    body('paymentMethod')
        .exists()
        .isString()
        .withMessage('Please provide a valid payment method'),
    body('referenceAndNotes')
        .exists()
        .isString()
        .withMessage('Please provide a valid reference and notes'),
    validateRequest
];

const validateInvoiceTypeParam = [
    query('type')
        .optional()
        .isIn(['paid', 'unpaid', 'overdue', 'due', 'dueToday'])
        .withMessage('Please provide a valid invoice status.'),
    validateRequest
];

module.exports = {
    validateMarkInvoiceAsRead,
    validateInvoiceTypeParam
}