const { calculateRefund } = require('../../modules/refund/refund.utils');

describe('Calculate refund', () => {
  test('With normal integer', () => {
    const refund = calculateRefund(100);
    expect(refund).toBe(98);
  });

  test('With 1 decimal', () => {
    const refund = calculateRefund(100.105);
    expect(refund).toBe(98.1);
  });

  test('With 2 decimal and can be ceiled, gets floored', () => {
    const refund = calculateRefund(100.2);
    expect(refund).toBe(98.19);
  });

  test('Throws error with 0', () => {
    const withZero = () => calculateRefund(0);
    expect(withZero).toThrowError();
  });

  test('Throws error with a string', () => {
    const withString = () => calculateRefund('lalal');
    expect(withString).toThrowError();
  });

  test('Throws error with a negative number', () => {
    const withNegative = () => calculateRefund(-50);
    expect(withNegative).toThrow();
  });

  test('Throws error with huge number', () => {
    const withHuge = () => calculateRefund(9007199254740992);
    expect(withHuge).toThrowError();
  });
});
