const router = require('express').Router({ mergeParams: true });
const { requireSuperAdmin, requireAuthentication } = require('../admin/admin.middlwares');
const controller = require('./quickbooks.controller');

router.get('/info', controller.getInfo);
router.get('/connect',  controller.connectApp);
router.post('/webhook', controller.handleWebhook);
router.get('/callback', controller.handleCallback);

module.exports = router;
