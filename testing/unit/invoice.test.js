require('dotenv').config();
const prismaClient = require('../../prisma/prismaClient');
const { createProcessedRefunds, createRefund } = require('../utils/refund');
const { createVendor } = require('../utils/vendor');
const { generateInvoices } = require('../../modules/invoice/invoice.service');

beforeAll(async () => await prismaClient.$connect());

/**
 * How it should works:
 * Make a function that creates db state ready for generating invoices
 * Test:
 * - Try to get invoices (empty)
 * - Try to get invoices (exists)
 * - Try to get  invoices given a cursor
 */

describe('Generate invoice', () => {
  test('only 1 refund', async () => {
    const vendor = await createVendor();
    await createProcessedRefunds(vendor.id, 1);
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 1);
    await generateInvoices(vendor.id, startDate, new Date());
    const createdInvoices = await prismaClient.invoice.findMany({
      where: { vendorId: vendor.id },
      select: { refunds: { select: { id: true } } },
    });

    expect(createdInvoices).toHaveLength(1);

    const [createdInvoice] = createdInvoices;
    expect(createdInvoice.refunds).toHaveLength(1);
  });

  test('invoice with many refunds some within range and other outside & not included', async () => {
    const vendor = await createVendor();
    // Invoice range
    const invoiceStart = new Date('2021-07-04');
    const invoiceEnd = new Date('2021-07-06');

    const includedRefundsDate = new Date('2021-07-05');
    const includedRefundsNumber = 5;

    const notIncludedRefundsBeforeDate = new Date('2021-07-01');
    const notIncludedRefundsBeforeNumber = 5;

    const notIncludedRefundsAfterDate = new Date('2021-07-10');
    const notIncludedRefundsAfterNumber = 5;
    const [
      shouldBeAddedRefunds,
      shouldNotBeAddedRefundsBefore,
      shouldNotBeAddedRefundsAfter,
    ] = await Promise.all([
      createProcessedRefunds(
        vendor.id,
        includedRefundsNumber,
        includedRefundsDate
      ),
      createProcessedRefunds(
        vendor.id,
        notIncludedRefundsAfterNumber,
        notIncludedRefundsAfterDate
      ),
      createProcessedRefunds(
        vendor.id,
        notIncludedRefundsBeforeNumber,
        notIncludedRefundsBeforeDate
      ),
    ]);

    await generateInvoices(vendor.id, invoiceStart, invoiceEnd);
    const [createdInvoice] = await prismaClient.invoice.findMany({
      where: { vendorId: vendor.id },
      select: { refunds: { select: { id: true } } },
    });
    const invoiceRefunds = createdInvoice.refunds.map((refund) => refund.id);

    expect(invoiceRefunds).toHaveLength(shouldBeAddedRefunds.length);
    expect(invoiceRefunds).toEqual(
      expect.arrayContaining(shouldBeAddedRefunds)
    );
    expect(invoiceRefunds).not.toEqual(
      expect.arrayContaining([
        ...shouldNotBeAddedRefundsBefore,
        ...shouldNotBeAddedRefundsAfter,
      ])
    );
  });

  test('no invoice if no processed', async () => {
    const vendor = await createVendor();
    await createRefund(vendor.id);
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 1);
    await generateInvoices(vendor.id, startDate, new Date());
    const createdInvoice = await prismaClient.invoice.findMany({
      where: { vendorId: vendor.id },
    });

    expect(createdInvoice).toHaveLength(0);
  });

  test('no double invoices for same refunds', async () => {
    const vendor = await createVendor();
    await createProcessedRefunds(vendor.id, 10);
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 1);
    await generateInvoices(vendor.id, startDate, new Date());
    await generateInvoices(vendor.id, startDate, new Date());
    await generateInvoices(vendor.id, startDate, new Date());

    const createdInvoices = await prismaClient.invoice.findMany({
      where: { vendorId: vendor.id },
      select: { refunds: { select: { id: true } } },
    });

    expect(createdInvoices).toHaveLength(1);

    const [createdInvoice] = createdInvoices;
    expect(createdInvoice.refunds).toHaveLength(10);
  });
});

afterAll(async () => await prismaClient.$disconnect());
