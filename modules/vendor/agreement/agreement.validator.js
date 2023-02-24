const {body} = require("express-validator");
const validateRequest = require("../../../middlewares/validateRequest");

const validateIssueAgreement = [
    body('commercialName')
        .exists()
        .isString()
        .withMessage('Please provide a valid string for commercial Name'),
    body('industry')
        .exists()
        .isString()
        .withMessage('Please provide a valid string for industry'),
    body('ownerFirstName')
        .exists()
        .isString()
        .withMessage('Please provide a valid string for Owner First Name'),
    body('ownerLastName')
        .exists()
        .isString()
        .withMessage('Please provide a valid string for Owner Last Name'),
    body('state')
        .exists()
        .isString()
        .withMessage('Please provide a valid string for State'),
    body('address')
        .exists()
        .isString()
        .withMessage('Please provide a valid string for Address'),
    body('city')
        .exists()
        .isString()
        .withMessage('Please provide a valid string for City'),
    body('zip')
        .exists()
        .isNumeric()
        .withMessage('Please provide a valid string for Zip Number'),
    validateRequest,
];

module.exports = {
    validateIssueAgreement
}