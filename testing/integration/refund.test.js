const prismaClient = require('../../prisma/prismaClient');
const supertest = require('supertest');
const app = require('../../app');
const API = supertest(app);
const { createVendor, createVendorAndToken } = require('../utils/vendor');
const { createCustomer, getCustomerToken } = require('../utils/customer');
const { createVerifiedRefund, createRefund } = require('../utils/refund');
const {
  debitCard,
  bankAccount,
  getDeletedFundingSource,
} = require('../utils/fundingSource');

const generateCompleteData = () => ({
  productIds: [(Math.random() * 500).toString()],
  orderId: (Math.random() * 500).toString(),
  cardLastFour: '1111',
  amount: 1,
});

const mockDate = (durationInMinutes) => {
  const mockDate = new Date();
  mockDate.setMinutes(mockDate.getMinutes() + durationInMinutes);
  global.Date = jest.fn().mockImplementation(() => mockDate);
  global.Date.now = jest.fn().mockReturnValue(mockDate.valueOf());
};
let vendorId, vendorToken, refundId, refundToken;

beforeAll(async () => {
  await prismaClient.$connect();
  const vendorData = await createVendorAndToken();

  vendorId = vendorData.id;
  vendorToken = vendorData.token;
  const { body: refund } = await API.post(`/vendors/${vendorId}/refunds`).send(
    generateCompleteData()
  );

  refundId = refund.refundId;
  refundToken = refund.refundToken;
});

describe('create refund', () => {
  it('success with complete data', async () => {
    const completeData = generateCompleteData();
    const { body, status } = await API.post(
      `/vendors/${vendorId}/refunds`
    ).send(completeData);
    expect(status).toBe(200);
    expect(body).toHaveProperty('refundToken');
    expect(body).toHaveProperty('refundId');
  });

  it('fails with duplicated data', async () => {
    const completeData = generateCompleteData();
    await API.post(`/vendors/${vendorId}/refunds`).send(completeData);
    const { status } = await API.post(`/vendors/${vendorId}/refunds`).send(
      completeData
    );
    expect(status).toBe(400);
  });

  it('fails with no data', async () => {
    const { status } = await API.post(`/vendors/${vendorId}/refunds`);
    expect(status).toBe(400);
  });

  it('fails with some missing data', async () => {
    const notCompleteData = generateCompleteData();
    delete notCompleteData.amount;
    const { status } = await API.post(`/vendors/${vendorId}/refunds`).send(
      notCompleteData
    );
    expect(status).toBe(400);
  });

  it('fails with negative amount', async () => {
    const completeData = generateCompleteData();
    completeData.amount = -10;
    const { status } = await API.post(`/vendors/${vendorId}/refunds`).send(
      completeData
    );
    expect(status).toBe(400);
  });

  it('fails with zero amount', async () => {
    const completeData = generateCompleteData();
    completeData.amount = 0;
    const { status } = await API.post(`/vendors/${vendorId}/refunds`).send(
      completeData
    );
    expect(status).toBe(400);
  });

  it('fails with misformatted amount', async () => {
    const completeData = generateCompleteData();
    completeData.amount = '10,0000';
    const { status } = await API.post(`/vendors/${vendorId}/refunds`).send(
      completeData
    );
    expect(status).toBe(400);
  });

  it('fails with misformatted lastFour', async () => {
    const completeData = generateCompleteData();
    completeData.cardLastFour = ',wrq';
    const { status } = await API.post(`/vendors/${vendorId}/refunds`).send(
      completeData
    );
    expect(status).toBe(400);
  });
});

describe('get refund data', () => {
  it('success with correct id and token', async () => {
    const { status } = await API.get(
      `/vendors/${vendorId}/refunds/${refundId}`
    ).set('Authorization', `Bearer ${refundToken}`);

    expect(status).toBe(200);
  });

  it('returns numeric value greater than zero', async () => {
    const {
      body: { eligibleAmount },
    } = await API.get(`/vendors/${vendorId}/refunds/${refundId}`).set(
      'Authorization',
      `Bearer ${refundToken}`
    );
    expect(eligibleAmount).toBeGreaterThan(0);
  });

  it('fails with incorrect id and valid token', async () => {
    const { status } = await API.get(
      `/vendors/${vendorId}/refunds/${Math.random() * 100}`
    ).set('Authorization', `Bearer ${refundToken}`);

    expect(status).toBe(400);
  });

  it('fails without id and valid token', async () => {
    const { status } = await API.get(`/vendors/${vendorId}/refunds`).set(
      'Authorization',
      `Bearer ${refundToken}`
    );

    expect(status).toBe(401); //Because it tries to retrieve the vendor's refunds not specific refund
  });

  it('fails with valid id and without token', async () => {
    const { status } = await API.get(
      `/vendors/${vendorId}/refunds/${refundId}`
    );
    expect(status).toBe(401);
  });
});
// TODO: move it to sparate module
describe('get invoices data', () => {
  it('success with correct id and token', async () => {
    const { status } = await API.get(`/vendors/${vendorId}/invoices`).set(
      'Authorization',
      `Bearer ${vendorToken}`
    );

    expect(status).toBe(200);
  });

  it('returns numeric value', async () => {
    const {
      body: { totalCount },
    } = await API.get(`/vendors/${vendorId}/invoices`).set(
      'Authorization',
      `Bearer ${vendorToken}`
    );
    expect(totalCount).toBeDefined();
  });

  it('get invoice stats', async () => {
    const {
      body: { totalDuePayments },
    } = await API.get(`/vendors/${vendorId}/invoices/stats`).set(
      'Authorization',
      `Bearer ${vendorToken}`
    );
    expect(totalDuePayments).toBeDefined();
  });
});

describe('process refund', () => {
  let debitCustomer, bankCustomer;
  const agreementData = { openedAgreement: true, agreementDate: new Date() };
  beforeAll(async () => {
    [debitCustomer, bankCustomer] = await Promise.all([
      createCustomer(vendorId, null, debitCard.email, true),
      createCustomer(vendorId, null, bankAccount.email, true),
    ]);
  });

  it('success with valid bank funding source', async () => {
    const refundId = await createVerifiedRefund(vendorId);
    const customerToken = await getCustomerToken(bankCustomer.email, refundId);
    const { body, status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fundingSource: bankAccount.fundingSource,
        ...agreementData,
      });

    expect(status).toBe(200);
    expect(body).toHaveProperty('transactionStatus');
  });

  it('success with valid debit funding source', async () => {
    const refundId = await createVerifiedRefund(vendorId);
    const customerToken = await getCustomerToken(debitCustomer.email, refundId);
    const { body, status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fundingSource: debitCard.fundingSourceLink,
        ...agreementData,
      });

    expect(status).toBe(200);
    expect(body).toHaveProperty('transactionStatus');
  });

  it('fails with invalid debit funding source', async () => {
    const refundId = await createVerifiedRefund(vendorId);
    const customerToken = await getCustomerToken(debitCustomer.email, refundId);
    const { body, status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fundingSource: debitCard.fundingSourceLink.concat('fsafd'),
        ...agreementData,
      });

    expect(status).toBe(404);
    expect(body).not.toHaveProperty('transactionStatus');
  });

  it('fails with invalid debit funding source', async () => {
    const refundId = await createVerifiedRefund(vendorId);
    const customerToken = await getCustomerToken(debitCustomer.email, refundId);
    const { body, status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fundingSource: debitCard.fundingSourceLink.concat('fsafd'),
        ...agreementData,
      });

    expect(status).toBe(404);
    expect(body).not.toHaveProperty('transactionStatus');
  });

  it('fails with deleted funding source', async () => {
    const customerData = await createCustomer(
      vendorId,
      null,
      `taw${Math.random() * 7000000000}@test.com`,
      true
    );

    const [refundId, deleteFundingSource] = await Promise.all([
      createVerifiedRefund(vendorId),
      getDeletedFundingSource(customerData.email),
    ]);
    const customerToken = await getCustomerToken(customerData.email, refundId);
    const { body, status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fundingSource: deleteFundingSource,
        ...agreementData,
      });

    expect(status).toBe(404);
    expect(body).not.toHaveProperty('transactionStatus');
  });

  it('fails with funding source attached to different customer', async () => {
    const refundId = await createVerifiedRefund(vendorId);
    const customerToken = await getCustomerToken(bankCustomer.email, refundId);
    const { body, status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fundingSource: debitCard.fundingSourceLink,
        ...agreementData,
      });

    expect(status).toBe(400);
    expect(body).not.toHaveProperty('transactionStatus');
    expect(body.message).toContain('different customer');
  });

  it('fails with no funding source', async () => {
    const refundId = await createVerifiedRefund(vendorId);
    const customerToken = await getCustomerToken(debitCustomer.email, refundId);
    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        ...agreementData,
      });

    expect(status).toBe(400);
  });

  it('fails with no agreement date', async () => {
    const refundId = await createVerifiedRefund(vendorId);
    const customerToken = await getCustomerToken(debitCustomer.email, refundId);
    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fundingSource: debitCard.fundingSourceLink,
        openedAgreement: true,
      });

    expect(status).toBe(400);
  });

  it('fails with not verified refund', async () => {
    const refundId = (await createRefund(vendorId)).id;
    const customerToken = await getCustomerToken(debitCustomer.email, refundId);
    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fundingSource: debitCard.fundingSourceLink,
        ...agreementData,
      });

    expect(status).toBe(410);
  });
  it('fails with expired', async () => {
    const refundId = await createVerifiedRefund(vendorId);
    const customerToken = await getCustomerToken(debitCustomer.email, refundId);
    mockDate(16);
    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/process`
    )
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fundingSource: debitCard.fundingSourceLink,
        ...agreementData,
      });

    expect(status).toBe(401);
  });
});

afterAll(async () => await prismaClient.$disconnect());
