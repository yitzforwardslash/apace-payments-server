const router = require('express').Router({ mergeParams: true });
const vendorValidator = require('./vendor.validator');
const refundRouter = require('./refund/refund.routes');
const invoiceRouter = require('../invoice/invoice.routes');
const cardRouter = require('./card/card.routes');
const bankAccountRouter = require('./bankAccount/bankAccount.routes');
const paymentMethodsRouter = require('./paymentMethod/paymentMethod.routes');
const agreementRouter = require('./agreement/agreement.routes');
const settingsRouter = require('./settings/settings.routes');
const payoutRouter = require('./payout/payout.routes');
const webhookSubscriptionRouter = require('../webhookSubscription/webhookSubscription.routes');
const vendorController = require('./vendor.controller');
const portalAuthentication = require('../../middlewares/portalAuthentication');
const {
  loginBruteHandler,
  twoFactorBruteHandler,
  signupBruteHandler,
  onboardpBruteHandler,
} = require('./vendor.middlewares');
const { requireAuthentication } = require('../admin/admin.middlwares');
const checkVendorActive = require('../../middlewares/checkVendorActive');

// router.post('/', validateAddVendor, vendorController.addNewVendor);
router.get(
  '/signup/options',
  signupBruteHandler,
  vendorController.signupOptions
);

router.post(
  '/signup',
  signupBruteHandler,
  vendorValidator.validateSignup,
  vendorController.signup
);

router.post(
  '/onboard',
  onboardpBruteHandler,
  vendorValidator.validateSetupVendorOnboard,
  vendorController.setupVendorOnboard
);

router.post(
  '/onboard/update',
  portalAuthentication,
  vendorValidator.validateOnboardUpdate,
  vendorController.updateOnboardData
);

router.post(
  '/onboard/submit',
  portalAuthentication,
  vendorValidator.validateOnboardSubmit,
  vendorController.submitForReview
);

router.get('/me', portalAuthentication, vendorController.getMe);

router.post(
  '/login',
  loginBruteHandler,
  vendorValidator.validateLogin,
  vendorController.login
);

/** 
 * Verify admin-vendor token to login
 * admin as a merchant
 */
router.post(
  '/admin/login',
  loginBruteHandler,
  vendorValidator.validateAdminLogin,
  vendorController.adminLogin
);

router.post(
  '/login/two-factor',
  twoFactorBruteHandler,
  vendorValidator.validateTwoFactor,
  vendorController.twoFactorAuth
);

router.post(
  '/change-password',
  vendorValidator.validateChangePassword,
  portalAuthentication,
  vendorController.changePassword
);

router.put(
  '/forgot-password/:receiver',
  vendorValidator.validateSendForgotCode,
  vendorController.sendForgotCode
);

router.post(
  '/forgot-password/:receiver',
  vendorValidator.validateForgotPassword,
  vendorController.forgotPassword
);

router.get(
  '/keys',
  portalAuthentication,
  checkVendorActive,
  vendorController.getApiKeys
);

router.post(
  '/keys',
  portalAuthentication,
  checkVendorActive,
  vendorValidator.validateCreateKey,
  vendorController.createNewApiKey
);

router.delete(
  '/keys/:publicId',
  portalAuthentication,
  checkVendorActive,
  vendorValidator.validateDeleteKey,
  vendorController.deleteApiKey
);

router.post(
  '/:vendorId/payment-token',
  portalAuthentication,
  vendorController.createPaymentToken
);

router.get(
  '/:vendorId/payment-methods',
  portalAuthentication,
  vendorController.getPaymentMethods
);

router.post(
  '/:vendorId/payment-methods',
  portalAuthentication,
  vendorValidator.validateAddPayment,
  vendorController.addPaymentMethod
);

router.post(
  '/:vendorId/payment-methods/default',
  portalAuthentication,
  vendorValidator.validateAddDefaultPaymentMethod,
  vendorController.addDefaultPaymentMethod
);

router.delete(
  '/:vendorId/payment-methods/',
  portalAuthentication,
  vendorValidator.validateDeletePayment,
  vendorController.deletePaymentMethod
);

router.get(
  '/:vendorId/customers',
  portalAuthentication,
  vendorController.getCustomers
);

router.post(
  '/:vendorId/customers/disabled',
  portalAuthentication,
  vendorValidator.validateAddRemoveDisabledCustomers,
  vendorController.addDisabledCustomers
);

router.delete(
  '/:vendorId/customers/disabled',
  portalAuthentication,
  vendorValidator.validateAddRemoveDisabledCustomers,
  vendorController.removeDiasbledCustomers
);

router.put(
  '/:vendorId',
  portalAuthentication,
  vendorValidator.validateUpdateVendor,
  vendorController.updateVendorData
);

router.put(
  '/:vendorId/logoUrl',
  portalAuthentication,
  vendorValidator.validateUpdateVendorLogo,
  vendorController.updateVendorLogo
);

router.get(
  '/:vendorId/stats',
  portalAuthentication,
  vendorValidator.validateGetStats,
  vendorController.getVendorStats
);

router.put(
  '/:vendorId/allow_autopay',
  portalAuthentication,
  vendorValidator.validateUpdateAllowAutopay,
  vendorController.updateAllowAutopay
);

router.put(
  '/:vendorId/setupEnabled',
  portalAuthentication,
  vendorValidator.validateUpdateSetupEnabled,
  vendorController.updateSetupEnabled
);

router.put(
  '/:vendorId/revenueShareEnabled',
  portalAuthentication,
  vendorValidator.validateUpdateRevenueShareEnabled,
  vendorController.updateRevenueShareEnabled
);

router.get(
  '/:vendorId/revenue-shares',
  portalAuthentication,
  vendorValidator.validateGetAvailableRevenueShare,
  vendorController.getVendorRevenueShares
);

router.get(
  '/:vendorId/available-revenue-share',
  portalAuthentication,
  vendorValidator.validateGetAvailableRevenueShare,
  vendorController.getVendorAvailableRevenueShare
);

router.use('/:vendorId/invoices', invoiceRouter);

router.use('/:vendorId/refunds', refundRouter);

router.use('/:vendorId/payouts', payoutRouter);

router.use('/cards', cardRouter);

router.use('/bank-accounts', bankAccountRouter);

router.use('/payment-methods', paymentMethodsRouter)

router.use('/agreement', agreementRouter);

router.use('/settings', settingsRouter);

router.use('/:vendorId/webhook-subscriptions', webhookSubscriptionRouter);

module.exports = router;
