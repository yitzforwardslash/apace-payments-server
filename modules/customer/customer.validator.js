const { body, query, param } = require('express-validator');
const validateRequest = require('../../middlewares/validateRequest');

const validateSendCode = [
  body('receiver')
    .if(body('receiver').not().isEmail())
    .isMobilePhone()
    .withMessage('Please provide a vaild email or phone number'),
  body('receiver')
    .if(body('receiver').not().isMobilePhone())
    .isEmail()
    .withMessage('Please provide a vaild email or phone number'),
  validateRequest,
];

const validateVerifyCode = [
  body('receiver')
    .if(body('receiver').not().isEmail())
    .isMobilePhone()
    .withMessage('Please provide a vaild email or phone number'),
  body('receiver')
    .if(body('receiver').not().isMobilePhone())
    .isEmail()
    .withMessage('Please provide a vaild email or phone number'),
  body('code').isInt().withMessage('Please provide your verification code'),

  validateRequest,
];

const valdiateAddCard = [
  // body('name')
  //   .isString()
  //   .withMessage('Please provide a valid string for name'),
  // body('type')
  //   .isString()
  //   .matches(/\b(?:credit|debit)\b/i)
  //   .withMessage('Please provide a valid string for type: debit|credit'),
  body('fullName')
    .isString()
    .withMessage('Please provide a valid stirng for fullName'),
  // body('lastFour')
  //   .isString()
  //   .withMessage('Please provide a valid string for lastFour'),
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

const validateGetCustomer = [
  query('email').isEmail().withMessage('Please provide a vaild email'),
  query('select').if(query('select').exists()).isIn(['phone']),
  validateRequest,
];

const validateCreateNewCutstomer = [
  body('phone')
    .if(body('email').not().exists())
    // .isMobilePhone()
    .matches(/^\+[0-9]{10,13}$/)
    .withMessage('Please provide a vaild mobile phone'),
  body('firstName')
    .isString()
    .withMessage('Please provide a vaild string for first name'),
  body('lastName')
    .isString()
    .withMessage('Please provide a valid string for last name'),
  body('email')
    .if(body('phone').not().exists())
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('ssn')
    .isString()
    .withMessage('Please provide a valid string for ssn'),
  body('dob')
    .isString()
    .matches(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/) // MM/DD/YYYY
    .withMessage('Please provide a valid string for dob in format MM/DD/YYYY'),
  body('address1')
    .isString()
    .withMessage('Please provide a valid string for address1'),
  body('address2')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid string for address2'),
  body('city')
    .isString()
    .withMessage('Please privde a valid string for city'),
  body('state')
    .isString()
    .withMessage('Please provide a valid string for state'),
  body('zip')
    .isString()
    .withMessage('Please provide a valid strin for zip'),
  validateRequest,
];

const validateUpdateCustomerData = [
  param('customerId').isInt().withMessage('Please provide a valid customerId'),
  validateRequest,
];

const validateHasId = [
  param('customerId').isInt().withMessage('Please provide a valid customerId'),
  validateRequest,
];

const verifyFunding = [
  query('method')
    .isIn(['debit', 'bank'])
    .withMessage(
      'Please provide the verification method, its either debit or bank'
    ),
  validateRequest,
];

module.exports = {
  validateSendCode,
  validateVerifyCode,
  valdiateAddCard,
  validateGetCustomer,
  validateCreateNewCutstomer,
  validateUpdateCustomerData,
  validateHasId,
  verifyFunding,
};
