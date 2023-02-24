const {param} = require('express-validator');
const validateRequest = require('../../../../middlewares/validateRequest');

const validateGetRefundById =[
    param('id')
        .exists()
        .isString()
        .withMessage('Please provide a valid vendor id'),
    validateRequest,
];

module.exports = {
    validateGetRefundById
}