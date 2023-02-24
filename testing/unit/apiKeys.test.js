const { getRandomKey } = require('../../modules/vendor/vendor.utils');

describe('generate random key', () => {
  it('success', async () => {
    const key = await getRandomKey();

    expect(key).toBeTruthy();
    expect(key).toHaveLength(100);
  });
});
