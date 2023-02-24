const router = require('express').Router({ mergeParams: true });
const adminRouter = require('../modules/admin/admin.routes');
const dashboardRouter = require('../modules/admin/dashboard/dashboard.routes');
const vendorRouter = require('../modules/vendor/vendor.routes');
const customerRouter = require('../modules/customer/customer.routes');
const webhookController = require('../modules/webhook/webhook.controller');
const webhookPublisher = require('../message-broker/publishers/webhook');
const storageRouter = require('../modules/storage/storage.routes');
const externalRouter = require('../modules/external/external.routes');
const aptpayWebhookRouter = require('../modules/aptpayWebhook/aptpayWebhook.routes');
const quickbookRouter = require('../modules/quckbooks/quickbooks.routes');

router.use('/admins', adminRouter);

router.use('/admins/dashboard', dashboardRouter);

router.use('/vendors', vendorRouter);

router.use('/customers', customerRouter);

router.use('/storage', storageRouter);

router.use('/ext', externalRouter)

router.use(`/${process.env.APTPAY_WEBHOOK_LISTENER_PATH}`, aptpayWebhookRouter);

router.use(`/quickbooks`, quickbookRouter   )

router.post(`/${process.env.WEBHOOK_LISTENER_PATH}`, webhookController);


router.post('/webhook-testing', (request, response) => {
  webhookPublisher(1, request.body);
  response.send({ success: true });
});

module.exports = router;
