const {
  payout: Payout,
  vendor: Vendor,
  vendorCard: VendorCard,
  vendorBankAccount: VendorBankAccount,
  globalSiteSetting: GlobalSiteSetting,
} = require('../../../prisma/prismaClient');
const { preparePagination } = require('../../admin/admin.utils');
const { calculatenNextCursor } = require('../../../utils/Pagination');
const AptPay = require('../../../utils/AptPay');
const Encrypt = require('../../../utils/Encrypt');
const cardService = require('../card/card.service');
const vendorService = require('../vendor.service');
const moment = require('moment');

const createPayout = async (payoutData) => {
  return await Payout.create({
    data: payoutData,
  });
};

const getVendorPayoutsTotalAmount = async (vendorId) => {
  const vendor = await Vendor.findUnique({
    where: { id: vendorId },
  });

  const monthStart = moment().startOf('month');

  let whereData = {
    vendorId,
    createdAt: {
      gte: monthStart.toISOString() /* Created date to be within last month */,
    },
  };

  const totalPayoutLastMonth = await Payout.aggregate({
    where: whereData,
    _sum: {
      amount: true,
    },
  });

  const feePercentage = parseFloat(
    (
      await GlobalSiteSetting.findUnique({
        where: { key: 'fee_percentage' },
      })
    ).value
  )
    .toString()
    .substr(0, 3);

  const feePercentageRevenueShare = parseFloat(
    (
      await GlobalSiteSetting.findUnique({
        where: { key: 'fee_percentage_revenue_share' },
      })
    ).value
  )
    .toString()
    .substr(0, 3);

  const feeMinimum = parseFloat(
    (
      await GlobalSiteSetting.findUnique({
        where: { key: 'fee_minimum' },
      })
    ).value
  )
    .toString()
    .substr(0, 3);

  return {
    totalPayoutAmount: vendor.paidRevenueShareAmount,
    totalPayoutCurrentMonth: totalPayoutLastMonth._sum.amount,
    revenueSharePercentage: vendor.revenueSharePercentage,
    availableRevenueShareAmount: vendor.availableRevenueShareAmount,
    feePercentage,
    feePercentageRevenueShare,
    feeMinimum,
  };
};

const issuePaymentToVendor = async (
  vendorId,
  { amount, cardId, bankAccountId }
) => {
  const vendor = await Vendor.findUnique({
    where: { id: vendorId },
  });

  if (vendor.status !== 'ACTIVE' || !vendor.aptpayId) {
    throw new Error('Can not issue payment for non-active vendor.');
  }

  if (amount > vendor.availableRevenueShareAmount) {
    throw new Error('Not sufficient funds.');
  }

  if (amount < 1) {
    throw new Error('Minimum payment amount is 1 USD.');
  }

  let payout = null;
  let paymentResult = null;

  if (cardId) {
    const vendorCard = await VendorCard.findFirst({
      where: { id: parseInt(cardId), vendorId },
    });
    payout = await Payout.create({
      data: {
        amount,
        vendorId,
        status: 'INITIALIZED',
        toType: 'CARD',
        toId: vendorCard.id,
        cardPayout: {
          create: {
            cardLastFour: vendorCard.lastFour,
            cardNetwork: vendorCard.network,
          },
        },
      },
    });

    try {
      paymentResult = await processCardPaymentTransaction(
        vendorCard.id,
        payout.id,
        amount
      );
    } catch (err) {
      await Payout.delete({ where: { id: payout.id } });
      throw err;
    }
  } else if (bankAccountId) {
    const bankAccount = await VendorBankAccount.findFirst({
      where: {
        id: Number.parseInt(bankAccountId),
        vendorId,
      },
    });

    payout = await Payout.create({
      data: {
        amount,
        vendorId,
        status: 'INITIALIZED',
        toType: 'BANK_ACCOUNT',
        toId: bankAccount.id,
      },
    });
    await Payout.update({
      where: {
        id: payout.id,
      },
      data: {
        bankAccountPayout: {
          create: {
            accountNumberLastFour: bankAccount.accountNumberLastFour,
            routingNumberLastFour: bankAccount.routingNumberLastFour,
          },
        },
      },
    });

    try {
      paymentResult = await processBankAccountPaymentTransaction(
        bankAccount.id,
        payout.id,
        amount
      );
    } catch (err) {
      await Payout.delete({ where: { id: payout.id } });
      throw err;
    }
  }

  await Payout.update({
    where: { id: payout.id },
    data: {
      status: paymentResult.status,
      transactionId: paymentResult.id,
    },
  });

  await Vendor.update({
    where: { id: payout.vendorId },
    data: {
      paidRevenueShareAmount: { increment: parseFloat(payout.amount) },
      availableRevenueShareAmount: {
        increment: parseFloat(`-${payout.amount}`),
      },
      totalRevenueShareAmount: { increment: parseFloat(`-${payout.amount}`) },
    },
  });

  return paymentResult;
};

const processCardPaymentTransaction = async (cardId, payoutId, amount) => {
  try {
    const card = await VendorCard.findUnique({
      where: { id: cardId },
      include: { vendor: true },
    });

    return await AptPay.createCardDisbursement({
      amount: Number.parseFloat(amount),
      currency: 'USD',
      disbursementNumber: Encrypt.decrypt(card.number),
      expirationDate: card.expirationDateEncrypted
        ? Encrypt.decrypt(card.expirationDate)
        : card.expirationDate,
      referenceId: payoutId,
      payeeId: card.vendor.aptpayId,
      custom1: `VendorId: ${card.vendor.id}`,
    });
  } catch (error) {
    throw error;
  }
};

const processBankAccountPaymentTransaction = async (
  bankAccountId,
  payoutId,
  amount
) => {
  try {
    const bankAccount = await VendorBankAccount.findUnique({
      where: { id: bankAccountId },
      include: {
        vendor: true,
      },
    });

    return await AptPay.createBankAccountACHDebit({
      identityId: bankAccount.vendor.aptpayId,
      amount: Number.parseFloat(amount),
      currency: 'USD',
      referenceId: payoutId,
      routingNumber: Encrypt.decrypt(bankAccount.routingNumber),
      accountNumber: Encrypt.decrypt(bankAccount.accountNumber),
      custom1: `VendorId: ${bankAccount.vendor.id}`,
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getVendorPayouts = async (vendorId, cursor, pageLength, page) => {
  const totalCount = await Payout.count({ where: { vendorId } });

  const paginationData = preparePagination(
    cursor,
    pageLength,
    totalCount,
    page
  );

  const payouts = await Payout.findMany({
    ...paginationData.pagination,
    where: {
      vendorId,
    },
    include: {
      cardPayout: true,
      bankAccountPayout: true,
    },
  });

  return {
    payouts,
    totalCount,
    totalPages: paginationData.totalPages,
    nextCursor: calculatenNextCursor(payouts),
    currentPage: Number.parseInt(page),
  };
};

module.exports = {
  getVendorPayouts,
  getVendorPayoutsTotalAmount,
  createPayout,
  issuePaymentToVendor,
};
