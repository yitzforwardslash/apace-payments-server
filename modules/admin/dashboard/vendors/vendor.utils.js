const jwt = require('jsonwebtoken');

module.exports.generateVendorAdminJWT = (vendorId, adminId) => {
    return jwt.sign(
      {
        id: vendorId,
        adminId,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1m' }
    );
  };
  