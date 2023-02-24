const {body} = require("express-validator");
const validateRequest = require("../../../middlewares/validateRequest");

const validateAddCard = [
    body('fullName')
        .isString()
        .withMessage('Please provide a valid string for fullName'),
    body('number')
        .isString()
        .withMessage('Please provide a valid string for number'),
    body('expirationDate')
        .isString()
        .withMessage('Please provide a valid string for expirationDate in format MM/YY'),
    body('cvv')
        .isString()
        .withMessage('Please provide a valid value for cvv'),
    validateRequest,
];

const validateUpdateDefaultCard = [
    body('cardId').isInt().withMessage('Please provide a valid card id'),
    validateRequest,
]

module.exports = {
    validateAddCard,
    validateUpdateDefaultCard
}