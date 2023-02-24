const express = require('express');
/**
 * @param {express.Request} request
 * @returns {String} ip address that this request was sent using
 */
module.exports = (request) =>
  request.headers['x-forwarded-for'] || request.socket.remoteAddress;
