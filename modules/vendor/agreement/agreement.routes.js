const router = require('express').Router({ mergeParams: true });
const agreementController = require('./agreement.controller');
const portalAuthentication = require('../../../middlewares/portalAuthentication');

router.get(
  '/',
  portalAuthentication,
  agreementController.issueVendorAgreement
);
router.get(
  '/download',
  portalAuthentication,
  agreementController.downloadUnsignedAgreement
);

module.exports = router;
