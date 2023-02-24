const router = require('express').Router();
const aptpayWebhookController = require('./aptpayWebhook.controller');
const { validateRequestHMAC } = require('./aptpayWebhook.validator');

router.post(
    '/',
    validateRequestHMAC,
    aptpayWebhookController.handleWebhook
);

module.exports = router;