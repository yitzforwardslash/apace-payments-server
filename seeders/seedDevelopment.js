const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateInvoices } = require('../modules/invoice/invoice.service');

async function main() {
  const startDate = new Date();
  const customersToBeCreated = [];
  for (let i = 0; i <= 100; i++) {
    customersToBeCreated.push({
      firstName: 's',
      lastName: 's',
      email: `${Date.now() * Math.random()}@gmail.com`,
      phone: `+2${Date.now() * Math.random()}`,
    });
  }
  await prisma.customer.createMany({ data: customersToBeCreated });
  const password = require('bcrypt').hashSync('123456', 10);
  let id;
  try {
    id = (
      await prisma.vendor.create({
        data: {
          email: 'xyz@mailinator.com',
          password,
          phone: Date.now().toString(),
          ownerFirstName: 's',
          ownerLastName: 's',
          commercialName: 's',
        },
      })
    ).id;
  } catch {
    id = (
      await prisma.vendor.findUnique({ where: { email: 'xyz@mailinator.com' } })
    ).id;
  }
  const refundsToBeCreated = [];
  for (let i = 1; i <= 100; i++) {
    refundsToBeCreated.push(
      {
        vendorId: id,
        cardLastFour: '1111',
        expirationDate: new Date(),
        customerId: i,
        refundDate: new Date(),
        status: 'processed',
        cvv: '11',
        amount: Math.random() * 10000,
        expirationMonth: 2,
        expirationYear: 22,
        transaction: 'ldldl',
        productIds: [(Math.random() * 500).toString()],
        orderId: (Math.random() * 500).toString(),
        agreementDate: new Date(),
      },
      {
        vendorId: id,
        cardLastFour: '1111',
        expirationDate: new Date(),
        customerId: i,
        refundDate: new Date(),
        status: 'failed',
        cvv: '11',
        amount: Math.random() * 10000,
        expirationMonth: 2,
        expirationYear: 22,
        transaction: 'ldldl',
        productIds: [(Math.random() * 500).toString()],
        orderId: (Math.random() * 500).toString(),
        agreementDate: new Date(),
      },
      {
        vendorId: id,
        cardLastFour: '1111',
        expirationDate: new Date(),
        customerId: i,
        refundDate: new Date(),
        status: 'pending',
        cvv: '11',
        amount: Math.random() * 10000,
        expirationMonth: 2,
        expirationYear: 22,
        transaction: 'ldldl',
        productIds: [(Math.random() * 500).toString()],
        orderId: (Math.random() * 500).toString(),
        agreementDate: new Date(),
      }
    );
  }
  await prisma.refund.createMany({ data: refundsToBeCreated });
  await generateInvoices(id, startDate, new Date());
}

module.exports = main;
