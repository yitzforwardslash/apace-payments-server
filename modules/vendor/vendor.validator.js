const { body, param, query } = require('express-validator');
const validateRequest = require('../../middlewares/validateRequest');
const {
  COUNTRY_CODE_OPTIONS,
  AVERAGE_MONTHLY_OPTIONS,
  INDUSTRY_OPTIONS,
  PLATFORM_OPTIONS,
} = require('../../utils/Constants');

const validateAddVendor = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('ownerFirstName')
    .isString()
    .withMessage('Please provide a valid string for ownerFirstName'),
  body('ownerLastName')
    .isString()
    .withMessage('Please provide a valid string for ownerLastName'),
  body('commercialName')
    .isString()
    .withMessage('Please provide a valid string for commercialName'),
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('invoiceDueInterval')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Please provide interval between 1 and 30 days'),
  validateRequest,
];

const validateSetupVendorOnboard = [
  body('signup_token')
    .isString()
    .withMessage('Please provide a valid string for signup_token'),
  body('firstname')
    .optional()
    .isString()
    .withMessage('Please provide a valid string for firstname'),
  body('lastname')
    .optional()
    .isString()
    .withMessage('Please provide a valid string for lastname'),
  body('commercialName')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid string for commercialName'),
  body('website').isString().withMessage('Please provide a valid website'),
  body('country')
    .isString()
    .isIn(COUNTRY_CODE_OPTIONS.map((option) => option.value))
    .withMessage('Please provide a valid country'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('ecommerce_platform')
    .optional()
    .isString()
    .withMessage('Please provide a valid ecommerce_platform'),
  body('consent')
    .optional()
    .isString()
    .withMessage('Please provide a valid consent'),
  body('avg_monthly_refunds')
    .optional()
    .isIn(AVERAGE_MONTHLY_OPTIONS.map((option) => option.value))
    .withMessage('Please provide a valid avg_monthly_refunds'),
  body('industry')
    .optional()
    .isString()
    .withMessage('Please provide a valid string industry'),
  body('allow_notify')
    .isBoolean()
    .withMessage('Please provide a valid boolean'),
  body('allow_twostepverify')
    .optional({ nullable: true })
    .isBoolean()
    .default(false)
    .withMessage('Please provide a valid boolean'),
  validateRequest,
];

const validateOnboardUpdate = [
  body('firstname')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid string for firstname'),
  body('lastname')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid string for lastname'),
  body('commercialName')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid string for commercialName'),
  body('website').isString().withMessage('Please provide a valid website'),
  body('dateOfIncorporation')
    .optional(true)
    .isString()
    .matches(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/) // MM/DD/YYYY
    .withMessage(
      'Please provide a valid string for dateOfIncorporation in format MM/DD/YYYY'
    ),
  body('dbaName')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid dbaName'),
  body('country')
    .optional(true)
    .isString()
    .isIn(COUNTRY_CODE_OPTIONS.map((option) => option.value))
    .withMessage('Please provide a valid country'),
  body('ecommerce_platform')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid ecommerce_platform'),
  body('avg_monthly_refunds')
    .optional(true)
    .isIn(AVERAGE_MONTHLY_OPTIONS.map((option) => option.value))
    .withMessage('Please provide a valid avg_monthly_refunds'),
  body('industry')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid string for industry'),
  body('annual_revenue')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid annual revenue'),
  body('daily_returns')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid annual daily_returns'),
  body('avg_item_price')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid annual avg_item_price'),
  body('entity')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid entity'),
  body('ein')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid ein'),
  body('street_1')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid street'),
  body('street_2')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid street'),
  body('city')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid city'),
  body('state')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid state'),
  body('zip')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid zip'),
  body('owner_firstname')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid firstname'),
  body('owner_lastname')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid lastname'),
  body('owner_dob')
    .optional(true)
    .isString()
    .matches(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/) // MM/DD/YYYY
    .withMessage(
      'Please provide a valid string for owner_dob in format MM/DD/YYYY'
    ),
  body('owner_ssn')
    .optional(true)
    .isString()
    .withMessage('Please provide a valid ssn'),
  body('owner_phone')
    .optional(true)
    .matches(/^[0-9]{3}\-[0-9]{3}\-[0-9]{4}$/)
    .withMessage('Please provide a valid phone in XXX-XXX-XXXX format'),
  validateRequest,
];

const validateOnboardSubmit = [
  body('agreementDate')
    .custom((value) => {
      const date = new Date(value);
      return date instanceof Date && !isNaN(date);
    })
    .withMessage('please provide avalid date for agreementDate'),
  validateRequest,
];

const validateSignup = [
  body('receiver')
    .if(body('receiver').not().isMobilePhone())
    .isEmail()
    .withMessage('Please provide a valid email/phone'),
  body('receiver')
    .if(body('receiver').not().isEmail())
    .isMobilePhone()
    .withMessage('Please provide a valid email/phone'),
  body('password').isString().withMessage('Please provide a valid password'),
  validateRequest,
];

const validateLogin = [
  body('receiver')
    .if(body('receiver').not().isMobilePhone())
    .isEmail()
    .withMessage('Please provide a valid email/phone'),
  body('receiver')
    .if(body('receiver').not().isEmail())
    .isMobilePhone()
    .withMessage('Please provide a valid email/phone'),
  body('password').isString().withMessage('Please provide a valid password'),
  validateRequest,
];

const validateAdminLogin = [
  body('adminVendorToken')
    .isString()
    .withMessage('Please provide a valid token'),
  validateRequest,
];

const validateSendForgotCode = [
  param('receiver')
    .if(param('receiver').not().isMobilePhone())
    .isEmail()
    .withMessage('Please provide a valid email/phone'),
  param('receiver')
    .if(param('receiver').not().isEmail())
    .isMobilePhone()
    .withMessage('Please provide a valid email/phone'),
  validateRequest,
];

const validateForgotPassword = [
  param('receiver')
    .if(param('receiver').not().isMobilePhone())
    .isEmail()
    .withMessage('Please provide a valid email/phone'),
  param('receiver')
    .if(param('receiver').not().isEmail())
    .isMobilePhone()
    .withMessage('Please provide a valid email/phone'),
  body('code').isNumeric().withMessage('Please provide a valid code'),
  validateRequest,
];

const validateChangePassword = [
  // body('password')
  //   .isStrongPassword({
  //     minLength: 8,
  //     minLowercase: 1,
  //     minNumbers: 1,
  //     minSymbols: 1,
  //     minUppercase: 1,
  //   })
  //   .withMessage(
  //     'Please provide a strong password. A strong password should contain at least: 8 characters, 1 lower case, 1 upper case, 1 number, and 1 symbol'
  //   ),
  validateRequest,
];

const validateTwoFactor = [
  body('receiver')
    .if(body('receiver').not().isMobilePhone())
    .isEmail()
    .withMessage('Please provide a valid email/phone'),
  body('receiver')
    .if(body('receiver').not().isEmail())
    .isMobilePhone()
    .withMessage('Please provide a valid email/phone'),
  body('password').isString().withMessage('Please provide a valid password'),
  body('code').isNumeric().withMessage('Please provide a valid code'),
  validateRequest,
];

const validateCreateKey = [
  body('name')
    .isString()
    .withMessage('Please provide a valid name for the key'),
  validateRequest,
];

const validateDeleteKey = [
  param('publicId').exists().withMessage('Please provide a valid publicId'),
  validateRequest,
];

const validateAddRemoveDisabledCustomers = [
  body('customers')
    .isArray({ min: 1 })
    .withMessage('Please provide at least one customer'),
  validateRequest,
];

const validateUpdateVendor = [
  body('email')
    .isEmail()
    .optional({ nullable: true })
    .withMessage('Please provide a valid email'),
  body('ownerFirstName')
    .isString()
    .optional({ nullable: true })
    .withMessage('Please provide a valid string for ownerFirstName'),
  body('ownerLastName')
    .isString()
    .optional({ nullable: true })
    .withMessage('Please provide a valid string for ownerLastName'),
  body('commercialName')
    .isString()
    .optional({ nullable: true })
    .withMessage('Please provide a valid string for commercialName'),
  body('phone')
    .isMobilePhone()
    .optional({ nullable: true })
    .withMessage('Please provide a valid phone number'),
  body('allow_twostepverify')
    .isBoolean()
    .withMessage('Please provide a valid boolean'),
  param('vendorId').custom((value, { req }) => {
    if (value != req.vendorId) {
      throw new Error('You can not modify another vendor data');
    }
    const { email, ownerFirstName, ownerLastName, commercialName, phone } =
      req.body;
    if (
      !email &&
      !ownerFirstName &&
      !ownerLastName &&
      !commercialName &&
      !phone
    ) {
      throw new Error(
        'You need to change at least one property of that vendor'
      );
    }
    return true;
  }),
  validateRequest,
];

const validateUpdateVendorLogo = [
  body('logoUrl')
    .isString()
    .withMessage('Please provide a valid url for logoUrl'),
  validateRequest,
];

const validateAddPayment = [
  body('publicToken')
    .if(body('fundingSource').not().exists())
    .isString()
    .withMessage('Please provide a valid public token'),
  body('accountId')
    .if(body('publicToken').exists())
    .isString()
    .withMessage('Please provide a valid account id'),
  body('fundingSource')
    .if(body('publicToken').not().exists())
    .isURL()
    .withMessage('Please provide a valid funding source'),
  validateRequest,
];

const validateDeletePayment = [
  query('fundingSource')
    .isURL()
    .withMessage('Please provide a valid funding source'),
  validateRequest,
];

const validateGetStats = [
  query('startDate')
    .isDate()
    .withMessage('Please provide a valid starting date'),
  query('endDate').isDate().withMessage('Please provide a valid ending date'),
  query('groupBy')
    .optional({ nullable: true })
    .isIn(['year', 'month', 'week', 'day', 'hour'])
    .withMessage(
      'Please provide a valid grouping. Valid groupings are: year, month, day, and hour'
    ),
  query('select')
    .optional({ nullable: true })
    .isIn(['refunds', 'invoices', 'customers', 'amount']),
  validateRequest,
];

const validateUpdateAllowAutopay = [
  body('allow_autopay')
    .isBoolean()
    .withMessage('Please provide avalid boolean for allow_autopay'),
  validateRequest,
];

const validateUpdateSetupEnabled = [
  body('setupEnabled')
    .isBoolean()
    .withMessage('Please provide avalid boolean for setupEnabled'),
  validateRequest,
];

const validateUpdateRevenueShareEnabled = [
  body('revenueShareEnabled')
    .isBoolean()
    .withMessage('Please provide avalid boolean for revenueShareEnabled'),
  validateRequest,
];

const validateAddDefaultPaymentMethod = [
  body('fundingSource')
    .isURL()
    .withMessage(
      'Please provide a valid funding source as default payment method'
    ),
  validateRequest,
];

const validateGetAvailableRevenueShare = [
  param('vendorId')
    .exists()
    .isString()
    .withMessage('Please provide a valid vendor id'),
  validateRequest,
];

module.exports = {
  validateLogin,
  validateAdminLogin,
  validateSignup,
  validateSetupVendorOnboard,
  validateOnboardUpdate,
  validateOnboardSubmit,
  validateTwoFactor,
  validateCreateKey,
  validateDeleteKey,
  validateAddVendor,
  validateAddRemoveDisabledCustomers,
  validateGetAvailableRevenueShare,
  validateSendForgotCode,
  validateForgotPassword,
  validateChangePassword,
  validateUpdateVendor,
  validateUpdateVendorLogo,
  validateAddPayment,
  validateDeletePayment,
  validateGetStats,
  validateAddDefaultPaymentMethod,
  validateUpdateAllowAutopay,
  validateUpdateRevenueShareEnabled,
  validateUpdateSetupEnabled,
};
