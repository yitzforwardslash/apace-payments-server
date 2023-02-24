const router = require('express').Router({mergeParams: true});
const {requireAuthentication, requireSuperAdmin} = require("../../admin.middlwares");
const vendorsController = require("./vendors.controller");
const {
    validateGetVendors,
    validateUpdateVendorStatus,
    validateGetVendorRefunds,
    validateGetFilteredVendorRefunds,
    validateUpdateVendorRefundListStatuses,
    validateToggleDNBApproval,
    validateToggleRevenueShare,
    validateUpdateRevenueShare,
    validateAdminVendorToken,
    validateUpdateInvoiceCycleType
} = require("./vendors.validator");
const {validateDateRangeParams, validateContainsIdParam, validateOrderParams} = require("../dashboard.validator");
const {validateInvoiceTypeParam} = require("../invoices/invoices.validator");


/* vendors list */
router.get('/', validateGetVendors, requireAuthentication, requireSuperAdmin, vendorsController.getVendors);
router.get('/count', requireAuthentication, requireSuperAdmin, vendorsController.getVendorsCount);
router.get('/download_csv', validateDateRangeParams, requireAuthentication, requireSuperAdmin, vendorsController.downloadVendorsCSV);
router.get('/:id', validateContainsIdParam, requireAuthentication, requireSuperAdmin, vendorsController.getVendorById);

/* vendor refunds */

/* get vendor refunds through GET request */
router.get('/:id/refunds',
    validateContainsIdParam,
    validateGetVendorRefunds,
    validateDateRangeParams,
    requireAuthentication,
    requireSuperAdmin,
    vendorsController.getVendorRefunds
);

/* get vendor refunds through POST request */
router.post('/:id/refunds', validateContainsIdParam, validateGetFilteredVendorRefunds, vendorsController.getFilteredVendorRefunds);

/* vendor invoices */
router.get('/:id/invoices',
    validateDateRangeParams,
    validateInvoiceTypeParam,
    validateContainsIdParam,
    validateOrderParams,
    requireAuthentication,
    requireSuperAdmin,
    vendorsController.getVendorInvoices
);

/* Vendor invoices stats */
router.get('/:id/invoices/stats', validateContainsIdParam, requireAuthentication, requireSuperAdmin, vendorsController.getVendorInvoicesStats);

/* vendor actions */
router.put('/:id/status',
    validateContainsIdParam,
    validateUpdateVendorStatus,
    requireAuthentication,
    requireSuperAdmin,
    vendorsController.updateVendorStatus
);

router.put('/:id/refundListStatuses',
    validateContainsIdParam,
    validateUpdateVendorRefundListStatuses,
    requireAuthentication,
    requireSuperAdmin,
    vendorsController.updateVendorRefundListStatuses
);

router.put('/:id/archive',
    validateContainsIdParam,
    requireAuthentication,
    requireSuperAdmin,
    vendorsController.archiveVendor
);

/* enable/disable revenue share option*/
router.put('/:id/revenueShareEnabled',
    validateContainsIdParam,
    validateToggleRevenueShare,
    requireAuthentication,
    requireSuperAdmin,
    vendorsController.toggleRevenueShare);


/* enable/disable dnp approval */
router.put('/:id/approvedByDNB',
    validateContainsIdParam,
    validateToggleDNBApproval,
    requireAuthentication,
    requireSuperAdmin,
    vendorsController.toggleDNBApproval);

/* Update vendor invoicingCycleType */
router.put('/:id/invoicingCycleType', validateContainsIdParam, validateUpdateInvoiceCycleType,
    requireAuthentication, requireSuperAdmin, vendorsController.updateInvoicingCycleType)

/* Updates revenue share percentage */
router.put('/:id/revenueSharePercentage', validateContainsIdParam, validateUpdateRevenueShare,
    requireAuthentication,
    requireSuperAdmin,
    vendorsController.updateRevenueShare);


/** Create admin-vendor temporary token **/
router.post(
  '/temp-token',
  validateAdminVendorToken,
  requireAuthentication,
  vendorsController.createAdminVendorTempToken
);

module.exports = router;