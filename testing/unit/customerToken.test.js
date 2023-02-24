require('dotenv').config();
const {
  generateCustomerLoginToken,
} = require('../../modules/customer/customer.utils');
const jwt = require('jsonwebtoken');

const TESTING_MAIL = 'test@apace.com';
const TESTING_PHONE = '+2123456';
const TESTING_IP = '1.1.1.1';

describe('Generate token', () => {
  test('Success with email', async () => {
    const generatedToken = await generateCustomerLoginToken(
      TESTING_MAIL,
      TESTING_IP,
      100
    );
    const decoded = jwt.decode(generatedToken);
    expect(decoded.id).toBe(TESTING_MAIL);
    expect(decoded.key).not.toBe(TESTING_IP);
  });

  test('Success with phone', async () => {
    const generatedToken = await generateCustomerLoginToken(
      TESTING_PHONE,
      TESTING_IP,
      100
    );
    const decoded = jwt.decode(generatedToken);
    expect(decoded.id).toBe(TESTING_PHONE);
    expect(decoded.key).not.toBe(TESTING_IP);
  });
});
