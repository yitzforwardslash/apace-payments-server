const router = require('express').Router({mergeParams: true});
const {requireAuthentication, requireSuperAdmin} = require("../../admin.middlwares");
const customersController = require("../customers/customers.controller");
const { validateContainsIdParam, validateDateRangeParams } = require("../dashboard.validator");
const { validateUpdateStatus } = require("./customers.validator")


router.get('/', requireAuthentication, requireSuperAdmin, customersController.getAllCustomers);
router.get('/download_csv', validateDateRangeParams, requireAuthentication, requireSuperAdmin, customersController.downloadCustomersAsCSV);
router.get('/:id', validateContainsIdParam, requireAuthentication, requireSuperAdmin, customersController.getCustomerById);
router.get('/:id/refunds', validateContainsIdParam, validateDateRangeParams, requireAuthentication, requireSuperAdmin, customersController.getCustomerRefunds);

/* Actions */
router.put('/:id/status', validateContainsIdParam, validateUpdateStatus, requireAuthentication, requireSuperAdmin, customersController.updateCustomerStatus)

module.exports = router;