const router = require('express').Router({ mergeParams: true });
const agreementRoutes = require('./agreement/agreement.routes');
const refundController = require('./refund.controller');
const refundValidator = require('./refund.validator');
const customerAuth = require('../../../middlewares/customerAuthentication');
const portalAuthentication = require('../../../middlewares/portalAuthentication');
const checkVendorEnabled = require('../../../middlewares/checkVendorEnabled');
const checkRefundToken = require('../../../middlewares/checkRefundToken');
const checkVendorActive = require('../../../middlewares/checkVendorActive');
const extractVendorFromRefundId = require('../../../middlewares/extractVendorFromRefundId');

// Gets all refunds for this vendor
router.get(
  '/',
  portalAuthentication,
  refundValidator.validateGetRefunds,
  refundController.getVendorRefunds
);

router.use('/:refundId/agreement', checkRefundToken(true), agreementRoutes);

router.post(
  '/:refundId/cancel',
  portalAuthentication,
  refundController.cancelRefund
);

// If refund details request.refundId is null, it should be a vendor request, go to next
router.get(
  '/:refundId',
  refundValidator.validateGetRefundData,
  checkRefundToken(true),
  refundController.getRefundData
);

// Should handle get refund details in case of authorization given
router.get(
  '/:refundId',
  refundValidator.validateGetRefund,
  portalAuthentication,
  refundController.getRefundDetails
);

// router.post(
//   '/',
//   refundValidator.validateNewRefund,
//   refundController.createNewRefund
// );

router.post(
  '/:refundId/process',
  refundValidator.validateProcess,
  customerAuth,
  // checkVendorEnabled,
  extractVendorFromRefundId,
  checkVendorActive,
  refundController.processRefund
);

module.exports = router;
