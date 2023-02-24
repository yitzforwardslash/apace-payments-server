const router = require('express').Router({mergeParams: true});
const adminValidator = require('./admin.validator');
const adminController = require('./admin.controller');
const logsRouter = require("./logs/logs.routes");
const settingsRouter = require("./globalSiteSettings/settings.router");
const {requireAuthentication, requireSuperAdmin} = require('./admin.middlwares');


/* Set password */
router.post('/set-password', adminValidator.validateSetAdminPassword, adminController.setPassword)

/* Auth routes */
router.post('/login', adminValidator.validateLogin, adminController.login);
router.post('/login/two-factor', adminValidator.validateTwoFactorLogin, adminController.twoFactorLogin);

/* Logs */
router.use('/logs', logsRouter);

/* Site global settings */
router.use('/settings', settingsRouter)

/* Admin actions */
router.get('/', requireAuthentication, requireSuperAdmin, adminController.getAdmins);
router.get('/:id', adminValidator.validateGetAdminById, requireAuthentication, requireSuperAdmin, adminController.getAdminById);
router.post('/', adminValidator.validateAddAdmin, requireAuthentication, requireSuperAdmin, adminController.addNewAdmin);
router.put('/:id', adminValidator.validateUpdateAdmin, requireAuthentication, requireSuperAdmin, adminController.updateAdmin);
router.delete('/:id', adminValidator.validateDeleteAdmin, requireAuthentication, requireSuperAdmin, adminController.deleteAdmin);

module.exports = router;