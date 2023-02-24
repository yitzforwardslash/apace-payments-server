const prismaClient = require('../../prisma/prismaClient');
const supertest = require('supertest');
const app = require('../../app');
const { createCustomer, getCustomerToken } = require('../utils/customer');
const { createVendorAndToken } = require('../utils/vendor');
const { createRefund } = require('../utils/refund');
const API = supertest(app);
const faker = require('faker');
const uniquePhone = require('random-mobile');

let /**@type {{customerId: number; firstName: string; lastName: string; phone: string; email: string;}} */
  customerData,
  vendorId,
  vendorToken,
  customerToken,
  refundToken;

const PHONE_NUMBER = uniquePhone();

const completeUserData = { firstName: 'test', lastName: 'test' };

beforeAll(async () => {
  await prismaClient.$connect();
  const vendor = await createVendorAndToken();
  vendorId = vendor.id;
  vendorToken = vendor.token;
  customerData = await createCustomer(vendorId, null, null, true);
  customerToken = await getCustomerToken(customerData.email);
  refundToken = (await createRefund(vendorId)).refundToken;
});

describe('get all customers', () => {
  it(`returns all customers`, async () => {
    const {
      status,
      body: { success, totalCount, customers },
    } = await API.get(`/vendors/${vendorId}/customers?cursor=0`).set(
      'Authorization',
      `Bearer ${vendorToken}`
    );
    expect(status).toBe(200);
    expect(success).toBe(true);
  });
  it(`fails with 401 if we do not pash vendor token`, async () => {
    const {
      status,
      body: { success, totalCount, customers },
    } = await API.get(`/vendors/${vendorId}/customers?cursor=0`);
    expect(status).toBe(401);
    expect(success).toBe(false);
  });
});

describe('get disabled customers', () => {
  it(`returns all disabled customers`, async () => {
    const {
      status,
      body: { success, totalCount, customers },
    } = await API.get(
      `/vendors/${vendorId}/customers?cursor=0&filter=disabled`
    ).set('Authorization', `Bearer ${vendorToken}`);
    expect(status).toBe(200);
    expect(success).toBe(true);
  });
  it(`fails with 401 if we do not pash vendor token`, async () => {
    const {
      status,
      body: { success, totalCount, customers },
    } = await API.get(
      `/vendors/${vendorId}/customers?cursor=0&filter=disabled`
    );
    expect(status).toBe(401);
    expect(success).toBe(false);
  });
});

describe('Disable/Enable customers', () => {
  it(`should disable customers with id`, async () => {
    const {
      status,
      body: { success },
    } = await API.post(`/vendors/${vendorId}/customers/disabled`)
      .send({ customers: [customerData.customerId] })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(status).toBe(200);
    expect(success).toBe(true);
  });
  it(`should fail with bad request with invalid customer id`, async () => {
    const {
      status,
      body: { success },
    } = await API.post(`/vendors/${vendorId}/customers/disabled`)
      .send({ customers: [new Date().getTime()] })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(status).toBe(400);
    expect(success).toBe(false);
  });
  it(`should enable disabled customer`, async () => {
    const {
      status,
      body: { success },
    } = await API.delete(`/vendors/${vendorId}/customers/disabled`)
      .send({ customers: [customerData.customerId] })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(status).toBe(200);
    expect(success).toBe(true);
  });
});

describe('customer exists', () => {
  it(`returns no when it doesn't exist`, async () => {
    const {
      status,
      body: { success },
    } = await API.get(
      `/customers?email=${faker.internet.email().toLowerCase()}`
    ).set('Authorization', `Bearer ${refundToken}`);
    expect(status).toBe(200);
    expect(success).toBeFalsy();
  });

  it('returns full data when it exists & no select query', async () => {
    const {
      status,
      body: { data: userData },
    } = await API.get(`/customers?email=${customerData.email}`).set(
      'Authorization',
      `Bearer ${refundToken}`
    );

    expect(status).toBe(200);
    expect(userData).toHaveProperty('id');
    expect(userData).toHaveProperty('phone');
    expect(userData).toHaveProperty('firstName');
    expect(userData).toHaveProperty('lastName');
    expect(userData).toHaveProperty('email');
  });

  it('returns only selected data when it exists & select query', async () => {
    const {
      body: { data },
    } = await API.get(
      `/customers?email=${customerData.email}&select=phone`
    ).set('Authorization', `Bearer ${refundToken}`);

    expect(data).toBe(customerData.phone);
  });

  it('fails with wrong selection query', async () => {
    const { status } = await API.get(
      `/customers?email=${customerData.email}&select=email`
    ).set('Authorization', `Bearer ${refundToken}`);

    expect(status).toBe(400);
  });

  it('fails without refund token', async () => {
    const { status } = await API.get(
      `/customers?email=${customerData.email}&select=phone`
    );

    expect(status).toBe(401);
  });
});

describe('create customer', () => {
  it('success with user token and full data', async () => {
    const email = faker.internet.email();
    const userToken = await getCustomerToken(email);
    const { body, status } = await API.put('/customers')
      .send({ ...completeUserData, phone: uniquePhone() })
      .set('Authorization', `Bearer ${userToken}`);

    expect(status).toBe(200);
    expect(body).toHaveProperty('customerId');
    expect(body).toHaveProperty('fundingToken');
  });

  it('fails with user token and full data but different identifier than used during verification', async () => {
    const userToken = await getCustomerToken(
      faker.internet.email().toLowerCase()
    );
    const { status } = await API.put('/customers')
      .send({
        ...completeUserData,
        phone: uniquePhone(),
        email: faker.internet.email().toLowerCase(),
      })
      .set('Authorization', `Bearer ${userToken}`);

    expect(status).toBe(400);
  });

  it('fails with user token and missing data', async () => {
    const userToken = await getCustomerToken(
      faker.internet.email().toLowerCase()
    );
    const { status } = await API.put('/customers')
      .send({
        firstName: 's',
        phone: uniquePhone(),
      })
      .set('Authorization', `Bearer ${userToken}`);

    expect(status).toBe(400);
  });

  it('fails without user token', async () => {
    const { status } = await API.put('/customers').send({
      ...customerData,
      phone: uniquePhone(),
    });

    expect(status).toBe(401);
  });
});

describe('update customer', () => {
  it('success given correct id, token, and unique data', async () => {
    const newFirstName = (Math.random() * 5000).toString();
    const { status } = await API.post(`/customers/${customerData.customerId}`)
      .send({ firstName: newFirstName })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(201);

    const {
      body: { data: updatedData },
    } = await API.get(`/customers?email=${customerData.email}`).set(
      'Authorization',
      `Bearer ${refundToken}`
    );

    expect(updatedData.firstName).toBe(newFirstName);
    expect(updatedData.lastName).toBe(customerData.lastName);
  });

  it('returns fundingToken', async () => {
    const newFirstName = (Math.random() * 5000).toString();
    const { status, body } = await API.post(
      `/customers/${customerData.customerId}`
    )
      .send({ firstName: newFirstName })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(201);
    expect(body).toHaveProperty('fundingToken');
  });

  it('fails given correct id, token, and not unique data', async () => {
    const {
      status,
      body: { message },
    } = await API.post(`/customers/${customerData.customerId}`)
      .send({ phone: PHONE_NUMBER })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
    expect(message).toContain('email/phone');
  });

  it('fails given invalid id', async () => {
    const { status } = await API.post(`/customers/fdsafdsa`)
      .send({ firstName: 's' })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
  });

  it('fails given not same customerId', async () => {
    const { status } = await API.post(`/customers/0`)
      .send({ firstName: 's' })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(401);
  });

  it('fails given valid data but no token', async () => {
    const { status } = await API.post(
      `/customers/${customerData.customerId}`
    ).send({
      firstName: 's',
    });

    expect(status).toBe(401);
  });
});

describe('create funding token', () => {
  it('success with customer token', async () => {
    const { status, body } = await API.post(`/customers/funding-token`).set(
      'Authorization',
      `Bearer ${customerToken}`
    );

    expect(status).toBe(200);
    expect(body).toHaveProperty('fundingToken');
  });

  it('fails with no customer token', async () => {
    const { status } = await API.post(`/customers/funding-token`);

    expect(status).toBe(401);
  });
});

afterAll(async () => await prismaClient.$disconnect());
