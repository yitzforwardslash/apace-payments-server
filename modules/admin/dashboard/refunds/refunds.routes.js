const router = require('express').Router({mergeParams: true});
const {validateDateRangeParams, validateContainsIdParam} = require("../dashboard.validator");
const {requireAuthentication, requireSuperAdmin} = require("../../admin.middlwares");
const refundsController = require("./refunds.controller");

router.get('/amount', validateDateRangeParams, requireAuthentication, requireSuperAdmin, refundsController.getRefundsTotalAmount);
router.get('/count', validateDateRangeParams, requireAuthentication, requireSuperAdmin, refundsController.getRefundsTotalCount);
router.get('/download_csv', validateDateRangeParams, requireAuthentication, requireSuperAdmin, refundsController.downloadRefundsAsCSV)
router.get('/', validateDateRangeParams, requireAuthentication, requireSuperAdmin, refundsController.getAllRefunds)
router.get('/:id', validateContainsIdParam, requireAuthentication, requireSuperAdmin, refundsController.getRefundById)

/* Refunds' actions */
router.put('/:id/cancel', validateContainsIdParam, requireAuthentication, requireSuperAdmin, refundsController.cancelRefund)

module.exports = router;