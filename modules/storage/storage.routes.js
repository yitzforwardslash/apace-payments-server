const router = require('express').Router();
const portalAuthentication = require('../../middlewares/portalAuthentication');
const { validateUpload } = require('./storage.validator');
const storageController = require('./storage.controller');

router.get('/*', storageController.getImage);

router.post(
  '/',
  portalAuthentication,
  validateUpload,
  storageController.addImage
);

module.exports = router;
