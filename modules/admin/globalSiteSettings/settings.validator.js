const {body} = require('express-validator');
const validateRequest = require('../../../middlewares/validateRequest');


const validateAddNewSetting = [
    body('key')
        .exists()
        .custom((value) => {
            return new RegExp(/^[\w-]+$/).test(value); /* Alphanumeric dash (Allow letters, numbers and underscores) */
        })
        .withMessage('Please provide a valid setting key'),
    body('value')
        .exists()
        .withMessage('Please provide a valid setting value'),
    validateRequest,
];

module.exports = {
    validateAddNewSetting
}