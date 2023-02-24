const prismaClient = require('../../prisma/prismaClient');
const supertest = require('supertest');
const app = require('../../app');
const {
  createVendorAndToken,
  getFakeData,
  createVendor,
  createApiKey,
} = require('../utils/vendor');
const API = supertest(app);

beforeAll(async () => {
  await prismaClient.$connect();
  vendor = await createVendorAndToken();
});

describe('update data', () => {
  it('success with correct token and data', async () => {
    const vendorData = getFakeData();
    const { status, body } = await API.put(`/vendors/${vendor.id}`)
      .send(vendorData)
      .set('Authorization', `Bearer ${vendor.token}`);

    expect(status).toBe(200);
    expect(body.vendorData).toMatchObject(vendorData);
  });

  it('fails without token', async () => {
    const vendorData = getFakeData();
    const { status } = await API.put(`/vendors/${vendor.id}`).send(vendorData);

    expect(status).toBe(401);
  });

  it('fails with correct token but no changes!', async () => {
    const { status } = await API.put(`/vendors/${vendor.id}`)
      .send({})
      .set('Authorization', `Bearer ${vendor.token}`);

    expect(status).toBe(400);
  });

  it('fails with correct token invalid phone', async () => {
    const { status } = await API.put(`/vendors/${vendor.id}`)
      .send({ phone: '1' })
      .set('Authorization', `Bearer ${vendor.token}`);

    expect(status).toBe(400);
  });

  it('fails with correct token duplicate phone', async () => {
    const anotherVendor = await createVendor();
    const { status, body } = await API.put(`/vendors/${vendor.id}`)
      .send({ phone: anotherVendor.phone })
      .set('Authorization', `Bearer ${vendor.token}`);

    expect(status).toBe(400);
    expect(body.message).toContain('used phone');
  });
});

describe('api keys', () => {
  describe('create', () => {
    it('success with name', async () => {
      const { body, status } = await API.post('/vendors/keys')
        .send({ name: 'test' })
        .set('Authorization', `Bearer ${vendor.token}`);

      expect(status).toBe(200);
      expect(body).toHaveProperty('createdApiKey');
      expect(body.createdApiKey).toHaveProperty('publicId');
      expect(body.createdApiKey).toHaveProperty('apiKey');
      expect(body.createdApiKey.keyName).toBe('test');
    });

    it('fails without name', async () => {
      const { body, status } = await API.post('/vendors/keys')
        .send({})
        .set('Authorization', `Bearer ${vendor.token}`);

      expect(status).toBe(400);
      expect(body).not.toHaveProperty('createdApiKey');
    });
  });

  describe('get', () => {
    it('success when there are many keys', async () => {
      const vendorData = await createVendorAndToken();
      await Promise.all([
        createApiKey(vendorData.id),
        createApiKey(vendorData.id),
      ]);

      const { status, body } = await API.get('/vendors/keys').set(
        'Authorization',
        `Bearer ${vendorData.token}`
      );

      expect(status).toBe(200);
      expect(body.apiKeys).toHaveLength(2);
      expect(body.apiKeys[0]).toHaveProperty('publicId');
      expect(body.apiKeys[0]).not.toHaveProperty('apiKey');
      expect(body.apiKeys[1]).toHaveProperty('publicId');
      expect(body.apiKeys[1]).not.toHaveProperty('apiKey');
    });

    it('success when there is no key', async () => {
      const vendorData = await createVendorAndToken();

      const { status, body } = await API.get('/vendors/keys').set(
        'Authorization',
        `Bearer ${vendorData.token}`
      );

      expect(status).toBe(200);
      expect(body.apiKeys).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('success when existing key', async () => {
      const vendorData = await createVendorAndToken();
      const { publicId } = await createApiKey(vendorData.id);
      const { body, status } = await API.delete(
        `/vendors/keys/${publicId}`
      ).set('Authorization', `Bearer ${vendorData.token}`);

      expect(status).toBe(200);
      expect(body.message).toContain('deleted successfully');
    });

    it('fails when not existing key', async () => {
      const vendorData = await createVendorAndToken();
      const { status } = await API.delete(
        `/vendors/keys/abcdefghjklmnopqrt`
      ).set('Authorization', `Bearer ${vendorData.token}`);

      expect(status).toBe(404);
    });

    it('fails when no token', async () => {
      const vendorData = await createVendorAndToken();
      const { publicId } = await createApiKey(vendorData.id);
      const { status } = await API.delete(`/vendors/keys/${publicId}`);

      expect(status).toBe(401);
    });
  });
});

afterAll(async () => {
  await prismaClient.$disconnect();
});
