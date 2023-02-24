require('dotenv').config();
const jwt = require('jsonwebtoken');
const { generateRefundToken } = require('../../modules/refund/refund.utils');

const mockDate = (durationInMinutes) => {
  const mockDate = new Date();
  mockDate.setMinutes(mockDate.getMinutes() + durationInMinutes);
  global.Date = jest.fn().mockImplementation(() => mockDate);
  global.Date.now = jest.fn().mockReturnValue(mockDate.valueOf());
};

describe('refund token', () => {
  it('should work within 15 min', async () => {
    const refundToken = generateRefundToken(1);
    mockDate(10);
    expect(() => jwt.verify(refundToken, process.env.JWT_SECRET)).not.toThrow(
      jwt.TokenExpiredError
    );
  });

  it('should expire after 15 min', async () => {
    const refundToken = generateRefundToken(1);
    mockDate(15);
    expect(() => jwt.verify(refundToken, process.env.JWT_SECRET)).toThrowError(
      jwt.TokenExpiredError
    );
  });
});
