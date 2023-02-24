const {body} = require("express-validator");
const validateRequest = require("../../../../middlewares/validateRequest");

const validateUpdateStatus = [
    body('status')
        .exists()
        .isString()
        .isIn(['active', 'disabled'])
        .withMessage('Please provide a valid status'),
    validateRequest,
];

module.exports = {
    validateUpdateStatus
}