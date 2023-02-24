const router = require('express').Router({ mergeParams: true });
const portalAuthentication = require('../../middlewares/portalAuthentication');
const invoiceController = require('./invoice.controller');
const invoiceValidator = require('./invoice.validator');

router.get('/', portalAuthentication, invoiceController.getVendorInvoices);

router.post(
  '/:invoiceId/pay',
  portalAuthentication,
  invoiceController.payInvoice
);

router.post('/pay-all', portalAuthentication, invoiceController.payAllInvoices);

router.get(
  '/:invoiceId/refunds',
  portalAuthentication,
  invoiceController.getInvoiceRefunds
);

router.get(
  '/stats',
  portalAuthentication,
  invoiceValidator.validateInvoiceStats,
  invoiceController.getVendorInvoiceStats
);

module.exports = router;
