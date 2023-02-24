const prisma = require('../../../prisma/prismaClient');
const ParseFloatNumber = require('../../../utils/ParseFloatNumber');
const async = require('async');
const { calculateRefund } = require('../../vendor/refund/refund.utils');

const getRefundsQueryByStatus = async ({
  customerEmail,
  customerPhone,
  status,
}) => {
  const customer = await prisma.customer.findFirst({
    where: {
      ...(customerEmail ? { email: customerEmail } : {}),
      ...(customerPhone ? { phone: customerPhone } : {}),
    },
  });
  let where;
  if (status === 'processed' && customer) {
    where = {
      customerId: customer.id,
      status: { in: ['processed', 'pending'] },
    };
  }

  const customerOR = [
    { customerEmail: customer ? customer.email : customerEmail },
  ];

  if (customer) {
    customerOR.push({ customerId: customer.id });
  }

  if (status === 'available') {
    where = {
      OR: customerOR,
      status: { in: ['initialized', 'viewed', 'receiverVerified'] },
      expirationDate: { gte: new Date() },
      expired: false,
    };
  }

  if (status === 'expired') {
    where = {
      OR: customerOR,
      status: { in: ['initialized', 'viewed', 'receiverVerified'] },
      expired: true,
    };
  }

  return where;
};

const getTotalAmountByStatus = async ({
  customerEmail,
  customerPhone,
  status,
}) => {
  const where = await getRefundsQueryByStatus({
    customerEmail,
    customerPhone,
    status,
  });

  const count = await prisma.refund.count({
    where,
  });
  const processFunArray = [];
  const perCycle = 50;
  let sum = 0;
  let fees = 0;

  for (let i = 0; i < count; i += perCycle) {
    processFunArray.push(async () => {
      const refunds = await prisma.refund.findMany({
        where,
        take: perCycle,
        skip: i,
        select: {
          vendorId: true,
          feeAmount: true,
          amount: true,
          vendor: {
            select: { revenueShareEnabled: true },
          },
        },
      });
      for await (const refund of refunds) {
        if (refund.feeAmount) {
          fees += parseFloat(refund.feeAmount);
        } else {
          const eligibleAmount = await calculateRefund(
            refund.vendorId,
            parseFloat(refund.amount)
          );
          const fee = parseFloat(refund.amount) - eligibleAmount;
          fees += fee;
        }
        sum += parseFloat(refund.amount);
      }
    });
  }

  await new Promise((resolve) =>
    async.parallelLimit(processFunArray, 5, () => resolve())
  );

  return sum - fees;
};

module.exports.getRefunds = async ({
  customerEmail,
  customerPhone,
  statuses = [],
}) => {
  const response = {
    processedRefunds: [],
    availableRefunds: [],
    processedRefunds: [],
  };

  if (statuses.includes('processed')) {
    const where = await getRefundsQueryByStatus({
      customerEmail,
      customerPhone,
      status: 'processed',
    });

    if (where) {
      response.processedRefunds = await prisma.refund.findMany({
        where,
      });
    }
  }

  if (statuses.includes('available')) {
    const where = await getRefundsQueryByStatus({
      customerEmail,
      customerPhone,
      status: 'available',
    });

    if (where) {
      response.availableRefunds = await prisma.refund.findMany({
        where,
      });
    }
  }

  if (statuses.includes('expired')) {
    const where = await getRefundsQueryByStatus({
      customerEmail,
      customerPhone,
      status: 'expired',
    });

    if (where) {
      response.expiredRefunds = await prisma.refund.findMany({
        where,
      });
    }
  }

  Object.keys(response).forEach((key) => {
    response[key] = response[key].map((item) => ({
      ...item,
      amount: ParseFloatNumber(item.amount),
    }));
  });

  return response;
};

module.exports.getStats = async ({ customerEmail, customerPhone }) => {
  const availableSum =
    (await getTotalAmountByStatus({
      customerEmail,
      customerPhone,
      status: 'available',
    })) || 0;
  const processedSum =
    (await getTotalAmountByStatus({
      customerEmail,
      customerPhone,
      status: 'processed',
    })) || 0;

  const expiredSum =
    (await getTotalAmountByStatus({
      customerEmail,
      customerPhone,
      status: 'expired',
    })) || 0;

  return {
    availableSum,
    processedSum,
    expiredSum,
  };
};

module.exports.getRefundDetails = async ({
  customerEmail,
  customerPhone,
  refundId,
}) => {
  const customer = await prisma.customer.findFirst({
    where: {
      ...(customerEmail ? { email: customerEmail } : {}),
      ...(customerPhone ? { phone: customerPhone } : {}),
    },
  });

  const customerOR = [
    { customerEmail: customer ? customer.email : customerEmail },
  ];

  if (customer) {
    customerOR.push({ customerId: customer.id });
  }

  const refund = await prisma.refund.findFirst({
    where: { OR: customerOR, id: refundId },
    include: {
      refundItems: true,
      transaction: true,
      customerCard: {
        select: { id: true, lastFour: true, network: true, fullName: true },
      },
      vendor: {
        select: { id: true, commercialName: true, logoUrl: true },
      },
    },
  });

  if (refund && !refund.feeAmount) {
    const eligibleAmount = await calculateRefund(
      refund.vendorId,
      refund.amount
    );
    refund.feeAmount = refund.amount - eligibleAmount;
  }

  return refund;
};
