const router = require('express').Router({ mergeParams: true });
const {
  requireAuthentication,
  requireSuperAdmin,
} = require('../../admin.middlwares');
const invoicesController = require('./invoices.controller');
const {
  validateMarkInvoiceAsRead,
  validateInvoiceTypeParam,
} = require('./invoices.validator');
const {
  validateDateRangeParams,
  validateContainsIdParam,
  validateGenerateInvoicesForVendors,
} = require('../dashboard.validator');

router.get(
  '/',
  validateDateRangeParams,
  validateInvoiceTypeParam,
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.getAllInvoices
);

/* Unpaid invoices from the past and till yesterday | also known as (outstanding invoices) */
router.get(
  '/overdue',
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.getOverdueInvoices
);

/* Unpaid invoices from tomorrow and up (in the future) */
router.get(
  '/due',
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.getDueInvoices
);

/* Unpaid invoices that due today */
router.get(
  '/due-today',
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.getDueTodayInvoices
);

router.get(
  '/download_csv',
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.downloadInvoicesAsCSV
);
router.get(
  '/:id',
  validateContainsIdParam,
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.getInvoiceById
);

router.get(
  '/due/amount',
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.getDueInvoicesTotalAmount
);
router.get(
  '/overdue/amount',
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.getOverdueInvoicesTotalAmount
);
router.get(
  '/paid/amount',
  validateDateRangeParams,
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.getPaidInvoicesTotalAmount
);

/* Invoice actions */
router.post(
  '/:id/mark-paid',
  validateContainsIdParam,
  validateMarkInvoiceAsRead,
  requireAuthentication,
  requireSuperAdmin,
  invoicesController.markInvoiceAsPaid
);
router.post(
  '/generate-invoices',
  requireAuthentication,
  requireSuperAdmin,
  validateGenerateInvoicesForVendors,
  invoicesController.generateInvoicesForVendors
);

module.exports = router;
