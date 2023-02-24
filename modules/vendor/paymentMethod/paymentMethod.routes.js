const router = require('express').Router({mergeParams: true});
const portalAuthentication = require("../../../middlewares/portalAuthentication");
const paymentMethodController = require("./paymentMethod.controller");

router.get(
    '/', 
    portalAuthentication,
    paymentMethodController.getVendorPaymentMethods
);

module.exports = router;