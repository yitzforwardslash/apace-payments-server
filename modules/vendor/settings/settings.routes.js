const router = require('express').Router({mergeParams: true});
const settingsController = require('./settings.controller');
const portalAuthentication = require("../../../middlewares/portalAuthentication");
const {validateUpdateDailyReportSetting} = require("./settings.validator");

router.put(
    '/dailyReportEnabled',
    portalAuthentication,
    validateUpdateDailyReportSetting,
    settingsController.updateDailyReportSetting
);

module.exports = router;