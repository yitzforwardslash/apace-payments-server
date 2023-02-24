const moment = require('moment');
const { body, param, query, validationResult } = require('express-validator');
const { ExternalValidationError } = require('../../utils/CustomError');

const validateNewRefund = [
    body('card_last_four')
        .isInt()
        .withMessage('Please provide an integer for cardLastFour'),
    body('customer')
    .optional(true)
    .isObject()
    .withMessage('Please provide an object for customer'),
    
    body('customer.email')
        .optional(true)
        .isEmail()
        .withMessage('Please provide an email for customer.email'),
    body('customer.first_name')
        .optional(true)
        .isString()
        .withMessage('Please provide a string for customer.first_name'),
    body('customer.last_name')
        .optional(true)
        .isString()
        .withMessage('Please provide a string for customer.last_name'),
    body('order_id')
        .isString()
        .withMessage('Please provide a valid string for order_id'),
    body('order_url')
        .optional(true)
        .isURL()
        .withMessage('Please provide a valid url for order_url'),
    body('order_date')
        .optional(true)
        .isDate({ format: 'MM/DD/YYYY' })
        .withMessage('Please provide a valid date form order_date in MM/DD/YYYY format'),
    body('expiration_date')
        .optional(true)
        .custom(value => {
            const date = new Date(value);
            return date instanceof Date && !isNaN(date) && moment(date).unix() > moment().unix();
        })
        .withMessage('Please provide valid expiration_date'),
    body('is_partial_refund')
        .optional()
        .isBoolean()
        .withMessage('Please provide a valid number for is_partial_refund'),
    body('refund_amount')
        .isNumeric()
        .custom((value) => {
            console.log({ value })
            if (Number.parseFloat(value) === 0) {
                return false;
            }
            return true;
        })
        .withMessage('Please provide a valid number for amount'),
    body('items')
        .isArray()
        .withMessage('Please provide an array of items'),
    body('items.*.item_id')
        .isString()
        .withMessage('Please provide valid string of items.item_id'),
    body('items.*.sku')
        .optional(true)
        .isString()
        .withMessage('Please provide a string for items.sku'),
    body('items.*.item_url')
        .optional(true)
        .isURL()
        .withMessage('Please provide a valid url for items.url'),
    body('items.*.item_image_url')
        .optional(true)
        .isURL()
        .withMessage('Please provide a valid url for items.url'),
    body('items.*.display_name')
        .isString()
        .withMessage('Please provide a valid string for items.display_name'),
    body('items.*.return_date')
        .optional(true)
        .isDate({ format: 'MM/DD/YYYY' }),
    body('items.*.unit_price')
        .optional(true)
        .isFloat()
        .withMessage('Please provide a valid float for unit_price'),
    body('items.*.return_qty')
        .optional(true)
        .isInt()
        .withMessage('Please provide a valid integer for items.return_qty'),

    body('refund_verification.url')
        .isURL()
        .withMessage('Please provide a valid url for refund_verification.url'),
    body('refund_verification.method')
        .optional(true)
        .default('GET')
        .isString()
        .matches(/\b(?:GET|POST|PUT|DELETE)\b/i)
        .withMessage('Please provide a valid value of refund_verification.method one of GET|POST|PUT|DELETE'),
    body('refund_notification.webhook_url')
        .isURL()
        .withMessage('Please provide a valid url for refund_notification.webhook_url'),
    body('refund_notification.redirect_url')
        .optional(true)
        .isURL()
        .withMessage('Please provide a valid url for refund_notification.redirect_url'),
    body('refund_notification.redirect_method')
        .optional(true)
        .default('POST')
        .isString()
        .matches(/\b(?:GET|POST|PUT|DELETE)\b/i)
        .withMessage('Please provide a valid value of refund_notification.redirect_method one of GET|POST|PUT|DELETE'),
    (request, response, next) => {
        const errors = validationResult(request);
        if (errors.isEmpty()) {
            return next();
        }

        const formattedErrors = errors.formatWith((error) => {
            return `${error.param}: ${error.msg}`
        })

        return next(new ExternalValidationError(formattedErrors.array()))
    }
];

module.exports = {
    validateNewRefund
}