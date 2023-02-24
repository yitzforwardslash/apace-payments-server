const router = require('express').Router({ mergeParams: true });
const agreementController = require('./agreement.controller');

router.get(
  '/',
  agreementController.issueRefundAgreement
);
router.get(
  '/download',
  agreementController.downloadUnsignedAgreement
);

module.exports = router;
