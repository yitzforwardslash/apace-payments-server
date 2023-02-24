const router = require('express').Router();
const {
  validateSendCode,
  validateVerifyCode,
  validateGetCustomer,
  validateCreateNewCutstomer,
  verifyFunding,
  validateHasId,
  valdiateAddCard,
} = require('./customer.validator');
const customerController = require('./customer.controller');
const checkRefundToken = require('../../middlewares/checkRefundToken');
const customerAuth = require('../../middlewares/customerAuthentication');
const portalAuth = require('../../middlewares/portalAuthentication');

router.get(
  '/',
  validateGetCustomer,
  checkRefundToken(false),
  customerController.getCustomer
);

router.put(
  '/',
  validateCreateNewCutstomer,
  customerAuth,
  customerController.createNewCustomer
);

// router.get(
//   '/verify-funding',
//   customerAuth,
//   verifyFunding,
//   customerController.checkFundingMatchesRefund
// );

// Sends code to the email
router.put(
  '/verify',
  checkRefundToken(false),
  validateSendCode,
  customerController.sendVerificationCode
);

// verify the send code
router.post(
  '/verify',
  checkRefundToken(false),
  validateVerifyCode,
  customerController.verifyCodeAndLogin
);

// router.post(
//   '/funding-token',
//   customerAuth,
//   customerController.createFundingToken
// );

router.get(
  '/cards',
  customerAuth,
  customerController.getCustomerCards
)


router.post(
  '/cards',
  valdiateAddCard,
  customerAuth,
  customerController.createNewCard
)

router.post(
  '/:customerId',
  validateHasId,
  customerAuth,
  customerController.updateCustomerData
);

router.get(
  '/:customerId/refunds',
  validateHasId,
  portalAuth,
  customerController.getCustomerRefunds
);

router.use('/refunds', require('./refund/refund.routes'))

module.exports = router;
