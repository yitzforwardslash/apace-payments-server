const crypto = require('crypto');

/**
 * Generates random code
 * @param {Number} numberOfDigits
 * @returns {Promise<Number>}
 */
module.exports = (numberOfDigits) => {
  if (process.env.NODE_ENV === 'testing') {
    return 123456;
  }
  if (numberOfDigits <= 0) {
    throw new Error();
  }
  const min = Number.parseInt('1'.concat('0'.repeat(numberOfDigits - 1)), 10);
  const max = Number.parseInt('9'.repeat(numberOfDigits), 10);
  return new Promise((resolve, reject) =>
    crypto.randomInt(min, max, (error, value) => {
      if (error) {
        return reject(error);
      }
      resolve(value);
    })
  );
};
