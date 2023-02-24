const router = require('express').Router({ mergeParams: true });
const externalValidator = require('./external.validator');
const externalController = require('./external.controller');
const vendorSecretAuthentication = require('../../middlewares/vendorSecretAuthentication');
const checkVendorActive = require('../../middlewares/checkVendorActive');

router.get(
    '/refunds',
    vendorSecretAuthentication,
    externalController.getVendorRefunds
)
// create new refund
router.post(
    '/refunds',
    vendorSecretAuthentication,
    checkVendorActive,
    externalValidator.validateNewRefund,
    externalController.createNewRefund
);

// Should handle get refund details in case of authorization given
router.get(
  '/refunds/:refundId',
  vendorSecretAuthentication,
  externalController.getRefundDetails
);


router.post(
    '/refunds/:refundId/email',
    vendorSecretAuthentication,
    externalController.sendRefundEmail
);

router.post(
    '/refunds/:refundId/cancel',
    vendorSecretAuthentication,
    externalController.cancelRefund
);

router.get(
    '/refunds/:refundId/email_tracking/empty_img.png',
    externalController.trackEmailOpened
)

module.exports = router;
