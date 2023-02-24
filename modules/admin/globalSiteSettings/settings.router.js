const router = require('express').Router({mergeParams: true});
const settingsController = require("./settings.controller");
const {requireAuthentication, requireSuperAdmin} = require("../admin.middlwares");
const {validateAddNewSetting} = require("./settings.validator");

router.get('/', requireAuthentication, requireSuperAdmin, settingsController.getGlobalSiteSettings);

router.put('/', requireAuthentication, requireSuperAdmin, settingsController.updateGlobalSiteSettings)

router.post('/', validateAddNewSetting, requireAuthentication, requireSuperAdmin, settingsController.addGlobalSiteSetting)


module.exports = router;