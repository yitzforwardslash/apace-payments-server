const crypto = require('crypto');

/**
 * @param {Object} message
 * @param {String} key
 * @returns {String}
 */
module.exports.signMessage = (message, key) =>
  crypto
    .createHmac('sha256', key)
    .update(Buffer.from(JSON.stringify(message)))
    .digest('hex');
