const { param, body } = require('express-validator');
const validateRequest = require('../../../middlewares/validateRequest');

const validateHasVendorIdParam = [
  param('vendorId')
    .exists()
    .isString()
    .withMessage('Please provide a valid vendor id'),
  validateRequest,
];

const validateReceivePayment = [
  body('amount')
    .exists()
    .isNumeric()
    .withMessage('Please provide a valid amount'),
  body('bankAccountId')
    .if(body('cardId').isEmpty())
    .isInt()
    .withMessage('Please provide a valid cardId or bankAccountId'),
//   body('card.fullName')
//     .if(body('cardId').isEmpty())
//     .isString()
//     .withMessage('Please provide a valid string for fullName'),
//   body('card.number')
//     .if(body('cardId').isEmpty())
//     .isString()
//     .isLength({ min: 16, max: 16 })
//     .withMessage('Please provide a valid string for number'),
//   body('card.expirationDate')
//     .if(body('cardId').isEmpty())
//     .isString()
//     .custom((value) => {
//       const dateRegEx = new RegExp(/^\d{4}-(0[1-9]|1[0-2])/);
//       return dateRegEx.test(value);
//     })
//     .withMessage(
//       'Please provide a valid string for expirationDate in format YYYY-MM'
//     ),
//   body('card.cvv')
//     .if(body('cardId').isEmpty())
//     .isString()
//     .isLength({ min: 3, max: 3 })
//     .withMessage('Please provide a valid value for cvv'),
  validateRequest,
];

module.exports = {
  validateHasVendorIdParam,
  validateReceivePayment,
};
