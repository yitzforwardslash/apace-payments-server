const { body } = require('express-validator');
const validateRequest = require('../../middlewares/validateRequest');

module.exports.validateUpload = [
  body('imageBase64').if(body('files.imageFile').not().exists()).isString(),
  body('files.imageFile').if(body('imageBase64').not().exists()).exists(),
  validateRequest,
];
