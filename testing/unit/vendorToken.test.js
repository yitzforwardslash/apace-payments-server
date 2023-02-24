require('dotenv').config();
const jwt = require('jsonwebtoken');
const { generateVendorJWT } = require('../../modules/vendor/vendor.utils');

const mockDate = (durationInMinutes) => {
  const mockDate = new Date();
  mockDate.setMinutes(mockDate.getMinutes() + durationInMinutes);
  global.Date = jest.fn().mockImplementation(() => mockDate);
  global.Date.now = jest.fn().mockReturnValue(mockDate.valueOf());
};

describe('vendor token', () => {
  it('should work within 60 min', () => {
    const vendorToken = generateVendorJWT(1);
    mockDate(10);
    expect(() => jwt.verify(vendorToken, process.env.JWT_SECRET)).not.toThrow(
      jwt.TokenExpiredError
    );
  });

  it('should expire after 60 min', () => {
    const vendorToken = generateVendorJWT(1);
    mockDate(80);
    expect(() => jwt.verify(vendorToken, process.env.JWT_SECRET)).toThrowError(
      jwt.TokenExpiredError
    );
  });
});
