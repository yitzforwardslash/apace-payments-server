const router = require('express').Router({mergeParams: true});
const logsController = require("./logs.controller");
const {requireAuthentication, requireSuperAdmin} = require("../admin.middlwares");


router.get('/get', requireAuthentication, requireSuperAdmin, logsController.getLogs);


module.exports = router;