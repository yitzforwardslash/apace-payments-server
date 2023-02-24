const {body, param} = require('express-validator');
const validateRequest = require('../../middlewares/validateRequest');

const validateGetAdminById = [
    param('id')
        .exists()
        .isNumeric()
        .withMessage('Please provide a valid admin id'),
    validateRequest,
];

const validateAddAdmin = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('firstName')
        .isString()
        .isLength({min: 3})
        .withMessage('Please provide a valid string for firstName'),
    body('lastName')
        .isString()
        .isLength({min: 3})
        .withMessage('Please provide a valid string for lastName'),
    body('phone')
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('role')
        .isString()
        .isIn(['Admin', 'SuperAdmin'])
        .withMessage('Please provide a valid role for admin'),
    validateRequest,
];

const validateUpdateAdmin = [
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email'),
    body('firstName')
        .optional()
        .isLength({min: 3})
        .isString()
        .withMessage('Please provide a valid string for firstName'),
    body('lastName')
        .optional()
        .isLength({min: 3})
        .isString()
        .withMessage('Please provide a valid string for lastName'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('role')
        .optional()
        .isString()
        .isIn(['Admin', 'SuperAdmin'])
        .withMessage('Please provide a valid role for admin'),
    body('password')
        .optional()
        .isString()
        .withMessage('Please provide a valid password'),
    validateRequest,
];

const validateDeleteAdmin = [
    param('id')
        .exists()
        .isNumeric()
        .withMessage('Please provide a valid admin id'),
    validateRequest,
];

/* Auth validations */
const validateLogin = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isString().withMessage('Please provide a valid password'),
    validateRequest,
];

const validateTwoFactorLogin = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isString().withMessage('Please provide a valid password'),
    body('code').isNumeric().withMessage('Please provide a valid code'),
    validateRequest,
];

const validateSetAdminPassword = [
    body('email').isString().isEmail().withMessage('Please provide a valid email'),
    body('password').isString().withMessage('Please provide a valid password'),
    body('password_confirmation')
        .isString()
        .custom(async (password_confirmation, {req}) => {
            const password = req.body.password
            if (password !== password_confirmation) {
                throw new Error('Password confirmation does not match')
            }
        })
        .withMessage('Password confirmation does not match'),
    validateRequest
];

module.exports = {
    validateGetAdminById,
    validateAddAdmin,
    validateUpdateAdmin,
    validateDeleteAdmin,
    validateLogin,
    validateTwoFactorLogin,
    validateSetAdminPassword
};
