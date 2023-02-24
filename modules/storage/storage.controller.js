const express = require('express');
const storageService = require('./storage.service');

function decodeBase64Image(dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], 'base64');

  return response;
}

/**
 * Uploads an image
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.addImage = async (request, response) => {
  const imageContent = request.body.files
    ? Buffer.from(request.body.files.imageFile.data, 'binary')
    : decodeBase64Image(request.body.imageBase64).data;

  let ext = '';
  if (request.body.imageBase64) {
    ext = request.body.imageBase64.split(',')[0].split('/')[1].split(';')[0];
    if (ext.includes('+')) {
      ext = ext.split('+')[0];
    }
  }

  const url = await storageService.uploadImage(imageContent, ext);
  if (url) {
    return response.send({
      success: true,
      profilePictureUrl: `/storage${url}`,
      url: `${process.env.API_URL}storage${url}`,
    });
  }
  response.sendStatus(500);
};

/**
 * Retrieves an image
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getImage = async (request, response) => {
  const imageBuffer = await storageService.retrieveImage(request.path);
  if (imageBuffer) {
    const ext = request.path.split('.').pop();
    const responseType = ext === 'svg' ? 'image/svg+xml' : ext || 'png';
    response.type(responseType);
    return response.send(imageBuffer);
  }
  response.sendStatus(404);
};
