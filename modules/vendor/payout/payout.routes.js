const router = require('express').Router({mergeParams: true});
const payoutController = require('./payout.controller');
const portalAuthentication = require("../../../middlewares/portalAuthentication");
const payoutValidator = require("./payout.validator");

router.get(
    '/',
    portalAuthentication,
    payoutValidator.validateHasVendorIdParam,
    payoutController.getVendorPayouts
);

router.get(
    '/total-amount',
    portalAuthentication,
    payoutValidator.validateHasVendorIdParam,
    payoutController.getVendorPayoutsTotalAmount
);

router.post(
    '/receive-payment',
    portalAuthentication,
    payoutValidator.validateHasVendorIdParam,
    payoutValidator.validateReceivePayment,
    payoutController.receivePayment
);


module.exports = router;