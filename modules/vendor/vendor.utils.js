const { randomFill } = require('crypto');
const { Buffer } = require('buffer');
const jwt = require('jsonwebtoken');

module.exports.getRandomKey = () =>
  new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(50);
    randomFill(buffer, (error, buffer) => {
      if (error) {
        return reject(error);
      } else {
        resolve(buffer.toString('hex'));
      }
    });
  });

/**
 * @param {String} vendorId can be email or phone
 * @returns {String}
 */
module.exports.generateVendorJWT = (vendorId) => {
  return jwt.sign(
    {
      id: vendorId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

/**
 * @param {String | Object | Buffer} payload can be email or phone with password
 * @returns {String}
 */
module.exports.generateSignupJWT = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};

/**
 * @param {String | Object | Buffer} token jwt token
 * @returns {{email?: string, phone?: string, password: string}}
 */
module.exports.verifyJWT = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports.getCustomersOrderBy = (orderBy, orderDirection) => {
  switch (orderBy) {
    case 'name':
      return {
        firstName: orderDirection || 'desc',
      };
    default:
      return {
        [orderBy]: orderDirection || 'desc',
      };
  }
};

module.exports.getCustomersSearch = (search) => {
  return {
    OR: [
      {
        firstName: { contains: search },
      },
      {
        lastName: { contains: search },
      },
      {
        email: { contains: search },
      },
    ],
  };
};
