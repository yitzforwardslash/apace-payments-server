const prisma = require('../prisma/prismaClient');

module.exports = async () => {
  console.log('Started expire refunds script');
  const expiringRefunds = await prisma.refund.findMany({
    where: {
      expirationDate: {
        lt: new Date(),
      },
      status: {
        notIn: ['processed', 'pending'],
      },
      expired: false,
    },
  });
  console.log('Expiring refunds', expiringRefunds);
  const updated = await prisma.refund.updateMany({
    where: {
      expirationDate: {
        lt: new Date(),
      },
      status: {
        notIn: ['processed', 'pending'],
      },
      expired: false,
    },
    data: {
      expired: true
    }
  });

  console.log('Ended expire refunds script', updated);
};
