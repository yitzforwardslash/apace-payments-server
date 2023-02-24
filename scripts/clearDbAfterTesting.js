require('dotenv').config();
const prisma = require('../prisma/prismaClient');

if (process.env.NODE_ENV !== 'testing') {
  console.log(
    'You are trying to delete a different db than the testing, Please be more careful!'
  );
  process.exit(-1);
}

prisma.$connect().then(async (client) => {
  await prisma.invoice.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.verifyCode.deleteMany();
  await prisma.vendorToken.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.webhookSubscription.deleteMany();
  console.log('Deleted all db data successfully, exiting.');
  process.exit(0);
});
