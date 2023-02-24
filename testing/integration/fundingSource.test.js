const prismaClient = require('../../prisma/prismaClient');
const supertest = require('supertest');
const app = require('../../app');
const { createCustomer, getCustomerToken } = require('../utils/customer');
const { createRefund } = require('../utils/refund');
const {
  debitCard,
  bankAccount,
  creditCard,
  accountWithManyDebitsAndBank,
  accountWithOneDebitAndBank,
  getPlaidToken,
} = require('../utils/fundingSource');
const { createVendor } = require('../utils/vendor');
const API = supertest(app);

let customerData, vendorId;

beforeAll(async () => {
  await prismaClient.$connect();
  vendorId = (await createVendor()).id;
  customerData = await createCustomer(vendorId, null, debitCard.email, true);
});

describe('verify debit', () => {
  it('success with same last four', async () => {
    const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
    const customerToken = await getCustomerToken(customerData.email, refundId);

    const { status, body } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-debit`
    )
      .send({ fundingSource: debitCard.fundingSourceLink })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(200);
    expect(body).toHaveProperty('plaidToken');

    const { status: refundStatus, customerId } =
      await prismaClient.refund.findUnique({
        where: { id: refundId },
        select: { status: true, customerId: true },
      });
    expect(refundStatus).toBe('receiverVerified');
    expect(customerId).toBe(customerData.customerId);
  });

  it('fails with different last four', async () => {
    const refundId = (await createRefund(vendorId, debitCard.differentLastFour))
      .id;
    const customerToken = await getCustomerToken(customerData.email, refundId);

    const { status, body } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-debit`
    )
      .send({ fundingSource: debitCard.fundingSourceLink })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
    expect(body).not.toHaveProperty('plaidToken');

    const { status: refundStatus, customerId } =
      await prismaClient.refund.findUnique({
        where: { id: refundId },
        select: { status: true, customerId: true },
      });
    expect(refundStatus).toBe('initialized');
    expect(customerId).toBeNull();
  });

  it('fails when refund already verified with same last four', async () => {
    const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
    const customerToken = await getCustomerToken(customerData.email, refundId);
    await prismaClient.refund.update({
      where: { id: refundId },
      data: { status: 'receiverVerified' },
    });

    const { status, body } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-debit`
    )
      .send({ fundingSource: debitCard.fundingSourceLink })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(410);
    expect(body).not.toHaveProperty('plaidToken');

    const { customerId } = await prismaClient.refund.findUnique({
      where: { id: refundId },
      select: { customerId: true },
    });
    expect(customerId).not.toBe(customerData.customerId);
  });

  it('fails when given fundingSource that attached to different customer', async () => {
    const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
    await createCustomer(vendorId, null, 't'.concat(customerData.email), true);
    const customerToken = await getCustomerToken(
      't'.concat(customerData.email),
      refundId
    );

    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-debit`
    )
      .send({ fundingSource: debitCard.fundingSourceLink })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
  });

  it('fails when given invalid url', async () => {
    const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
    const customerToken = await getCustomerToken(customerData.email, refundId);

    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-debit`
    )
      .send({ fundingSource: 'https://google.com' })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(404);
  });

  it('fails when given bank', async () => {
    const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
    await createCustomer(vendorId, null, bankAccount.email, true);
    const customerToken = await getCustomerToken(bankAccount.email, refundId);

    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-debit`
    )
      .send({ fundingSource: bankAccount.fundingSource })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
  });

  it('fails without token', async () => {
    const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-debit`
    ).send({ fundingSource: debitCard.fundingSourceLink });

    expect(status).toBe(401);
  });
});

describe('verify credit', () => {
  it('success when same last four', async () => {
    const refundId = (await createRefund(vendorId, creditCard.lastFour)).id;
    const customerToken = await getCustomerToken(customerData.email, refundId);

    const { status, body } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-credit`
    )
      .send({
        cardNumber: creditCard.fullNumber,
        expirationMonth: creditCard.expirationMonth,
        expirationYear: creditCard.expirationYear,
      })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(200);
    expect(body).toHaveProperty('plaidToken');

    const { status: refundStatus, customerId } =
      await prismaClient.refund.findUnique({
        where: { id: refundId },
        select: { status: true, customerId: true },
      });
    expect(refundStatus).toBe('receiverVerified');
    expect(customerId).toBe(customerData.customerId);
  });

  it('fails when different last four', async () => {
    const refundId = (
      await createRefund(vendorId, creditCard.differentLastFour)
    ).id;
    const customerToken = await getCustomerToken(customerData.email, refundId);

    const { status, body } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-credit`
    )
      .send({
        cardNumber: creditCard.fullNumber,
        expirationMonth: creditCard.expirationMonth,
        expirationYear: creditCard.expirationYear,
      })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
    expect(body).not.toHaveProperty('plaidToken');

    const { status: refundStatus, customerId } =
      await prismaClient.refund.findUnique({
        where: { id: refundId },
        select: { status: true, customerId: true },
      });
    expect(refundStatus).toBe('initialized');
    expect(customerId).not.toBe(customerData.customerId);
  });

  it('fails when refund already verified with same last four', async () => {
    const refundId = (await createRefund(vendorId, creditCard.lastFour)).id;
    const customerToken = await getCustomerToken(customerData.email, refundId);
    await prismaClient.refund.update({
      where: { id: refundId },
      data: { status: 'receiverVerified' },
    });

    const { status, body } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-credit`
    )
      .send({
        cardNumber: creditCard.fullNumber,
        expirationMonth: creditCard.expirationMonth,
        expirationYear: creditCard.expirationYear,
      })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(410);
    expect(body).not.toHaveProperty('plaidToken');

    const { customerId } = await prismaClient.refund.findUnique({
      where: { id: refundId },
      select: { customerId: true },
    });
    expect(customerId).not.toBe(customerData.customerId);
  });

  it('fails when given bank', async () => {
    const refundId = (await createRefund(vendorId, creditCard.lastFour)).id;
    const customerToken = await getCustomerToken(bankAccount.email, refundId);

    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-credit`
    )
      .send({ fundingSource: bankAccount.fundingSource })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
  });

  it('fails when given debit card number', async () => {
    const refundId = (
      await createRefund(vendorId, debitCard.lastFourFullNumberCard)
    ).id;
    const customerToken = await getCustomerToken(debitCard.email, refundId);

    const { status, body } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-credit`
    )
      .send({
        cardNumber: debitCard.fullNumberCard,
        expirationMonth: creditCard.expirationMonth,
        expirationYear: creditCard.expirationYear,
      })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
    expect(body.cardType).toBe('debit');
  });

  it('fails when no expiration month', async () => {
    const refundId = (await createRefund(vendorId, creditCard.lastFour)).id;
    const customerToken = await getCustomerToken(debitCard.email, refundId);

    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-credit`
    )
      .send({
        cardNumber: creditCard.fullNumber,
        expirationYear: creditCard.expirationYear,
      })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
  });

  it('fails when no expiration year', async () => {
    const refundId = (await createRefund(vendorId, creditCard.lastFour)).id;
    const customerToken = await getCustomerToken(debitCard.email, refundId);

    const { status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/verify-credit`
    )
      .send({
        cardNumber: creditCard.fullNumber,
        expirationMonth: creditCard.expirationMonth,
      })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
  });
});

describe('verify using exisitng', () => {
  it('success when method bank', async () => {
    const refundId = (await createRefund(vendorId, creditCard.lastFour)).id;
    const customerToken = await getCustomerToken(bankAccount.email, refundId);

    const { body, status } = await API.get(
      `/customers/verify-funding?method=bank`
    ).set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(200);
    expect(body).toHaveProperty('plaidToken');
    expect(body).toHaveProperty('bankAccounts');
    expect(body).toHaveProperty('lastThree');

    const { status: refundStatus } = await prismaClient.refund.findUnique({
      where: { id: refundId },
      select: { status: true, customerId: true },
    });
    expect(refundStatus).toBe('initialized');
  });

  it('success when many fundings and one matchs', async () => {
    const refundId = (
      await createRefund(vendorId, accountWithManyDebitsAndBank.lastFour)
    ).id;
    await createCustomer(
      vendorId,
      null,
      accountWithManyDebitsAndBank.email,
      false
    );
    const customerToken = await getCustomerToken(
      accountWithManyDebitsAndBank.email,
      refundId
    );

    const { body, status } = await API.get(
      `/customers/verify-funding?method=debit`
    ).set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(200);
    expect(body).toHaveProperty('plaidToken');
    expect(body).toHaveProperty('lastThree');
    expect(body.debitCards[0].fundingSourceLink).toContain(
      accountWithManyDebitsAndBank.id
    );
    expect(body.debitCards[0].lastFour).toBe(
      accountWithManyDebitsAndBank.lastFour
    );

    const { status: refundStatus } = await prismaClient.refund.findUnique({
      where: { id: refundId },
      select: { status: true },
    });
    expect(refundStatus).toBe('initialized');
  });

  it('success when only one matchs', async () => {
    const refundId = (
      await createRefund(vendorId, accountWithOneDebitAndBank.lastFour)
    ).id;
    await createCustomer(
      vendorId,
      null,
      accountWithOneDebitAndBank.email,
      false
    );
    const customerToken = await getCustomerToken(
      accountWithOneDebitAndBank.email,
      refundId
    );

    const { body, status } = await API.get(
      `/customers/verify-funding?method=debit`
    ).set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(200);
    expect(body).toHaveProperty('plaidToken');
    expect(body).toHaveProperty('lastThree');
    expect(body.debitCards[0].fundingSourceLink).toContain(
      accountWithOneDebitAndBank.id
    );
    expect(body.debitCards[0].lastFour).toBe(
      accountWithOneDebitAndBank.lastFour
    );

    const { status: refundStatus } = await prismaClient.refund.findUnique({
      where: { id: refundId },
      select: { status: true },
    });
    expect(refundStatus).toBe('initialized');
  });

  it('fails when one different last four funding', async () => {
    const refundId = (
      await createRefund(vendorId, accountWithOneDebitAndBank.differentLastFour)
    ).id;
    await createCustomer(
      vendorId,
      null,
      accountWithOneDebitAndBank.email,
      false
    );
    const customerToken = await getCustomerToken(
      accountWithOneDebitAndBank.email,
      refundId
    );

    const { body, status } = await API.get(
      `/customers/verify-funding?method=debit`
    ).set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
    expect(body).toHaveProperty('plaidToken');
    expect(body).toHaveProperty('lastThree');
    expect(body).not.toHaveProperty('debitCards');

    const { status: refundStatus } = await prismaClient.refund.findUnique({
      where: { id: refundId },
      select: { status: true },
    });
    expect(refundStatus).toBe('initialized');
  });

  it('fails when many different last four fundings', async () => {
    const refundId = (
      await createRefund(
        vendorId,
        accountWithManyDebitsAndBank.differentLastFour
      )
    ).id;
    await createCustomer(
      vendorId,
      null,
      accountWithManyDebitsAndBank.email,
      false
    );
    const customerToken = await getCustomerToken(
      accountWithManyDebitsAndBank.email,
      refundId
    );

    const { body, status } = await API.get(
      `/customers/verify-funding?method=debit`
    ).set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
    expect(body).toHaveProperty('plaidToken');
    expect(body).toHaveProperty('lastThree');
    expect(body).not.toHaveProperty('debitCards');

    const { status: refundStatus } = await prismaClient.refund.findUnique({
      where: { id: refundId },
      select: { status: true },
    });
    expect(refundStatus).toBe('initialized');
  });

  it('fails when no funding sources', async () => {
    const customerData = await createCustomer(vendorId, null, null, true);
    const refundId = (await createRefund(vendorId)).id;
    const customerToken = await getCustomerToken(customerData.email, refundId);

    const { body, status } = await API.get(
      `/customers/verify-funding?method=debit`
    ).set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
    expect(body).toHaveProperty('plaidToken');
    expect(body).toHaveProperty('lastThree');
    expect(body).not.toHaveProperty('debitCards');

    const { status: refundStatus } = await prismaClient.refund.findUnique({
      where: { id: refundId },
      select: { status: true },
    });
    expect(refundStatus).toBe('initialized');
  });
});

describe('add bank account', () => {
  it('success given full data & rtp support', async () => {
    const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
    const customerData = await createCustomer(vendorId, null, null, true);
    const customerToken = await getCustomerToken(customerData.email, refundId);
    const { publicToken, accountId } = await getPlaidToken();
    const { body, status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/bank-account`
    )
      .send({ publicToken, accountId })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(200);
    expect(body).toHaveProperty('bankAccounts');
  });

  it('fails given full data & no rtp support', async () => {
    const { publicToken, accountId } = await getPlaidToken();
    const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
    const customerData = await createCustomer(vendorId, null, null, true);
    const customerToken = await getCustomerToken(customerData.email, refundId);
    const envPaymentMethods = process.env.REAL_TIME_PAYMENTS;
    process.env.REAL_TIME_PAYMENTS = 'mocked';
    const { body, status } = await API.post(
      `/vendors/${vendorId}/refunds/${refundId}/bank-account`
    )
      .send({ publicToken, accountId })
      .set('Authorization', `Bearer ${customerToken}`);

    expect(status).toBe(400);
    expect(body).toHaveProperty('plaidToken');
    expect(body.message).toContain('Real-Time');
    expect(body).not.toHaveProperty('bankAccounts');
    process.env.REAL_TIME_PAYMENTS = envPaymentMethods;
  });

  describe('fails', () => {
    it('with missing accountId', async () => {
      const { publicToken } = await getPlaidToken();
      const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
      const customerData = await createCustomer(vendorId, null, null, true);
      const customerToken = await getCustomerToken(
        customerData.email,
        refundId
      );
      const { body, status } = await API.post(
        `/vendors/${vendorId}/refunds/${refundId}/bank-account`
      )
        .send({ publicToken })
        .set('Authorization', `Bearer ${customerToken}`);

      expect(status).toBe(400);
      expect(body).not.toHaveProperty('bankAccounts');
    });

    it('with missing publicToken', async () => {
      const { accountId } = await getPlaidToken();
      const refundId = (await createRefund(vendorId, debitCard.lastFour)).id;
      const customerData = await createCustomer(vendorId, null, null, true);
      const customerToken = await getCustomerToken(
        customerData.email,
        refundId
      );
      const { body, status } = await API.post(
        `/vendors/${vendorId}/refunds/${refundId}/bank-account`
      )
        .send({ accountId })
        .set('Authorization', `Bearer ${customerToken}`);

      expect(status).toBe(400);
      expect(body).not.toHaveProperty('bankAccounts');
    });
  });
});

afterAll(async () => await prismaClient.$disconnect());
