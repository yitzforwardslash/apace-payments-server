const router = require('express').Router({mergeParams: true});
const dashboardController = require('./dashboard.controller');
const {requireAuthentication, requireSuperAdmin} = require('../admin.middlwares');
const vendorsRouter = require("./vendors/vendors.routes");
const refundsRouter = require("./refunds/refunds.routes");
const invoicesRouter = require("./invoices/invoices.routes");
const customersRouters = require("./customers/customers.routes");


/* Available Balance */
router.get('/available-balance', requireAuthentication, requireSuperAdmin, dashboardController.getAvailableBalance);

router.get('/stats', requireAuthentication, requireSuperAdmin, dashboardController.getStats)

router.get('/funds', requireAuthentication, requireSuperAdmin, dashboardController.getFunds)

/* Refunds */
router.use('/refunds', refundsRouter)

/* Invoices */
router.use('/invoices', invoicesRouter)

/* Merchants (Vendors) */
router.use('/vendors', vendorsRouter)

/* Customers */
router.use('/customers', customersRouters)


module.exports = router;