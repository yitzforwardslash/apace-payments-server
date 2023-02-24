const {
  vendor: Vendor,
  revenueShare: RevenueShare,
  refund: Refund,
} = require('../../../prisma/prismaClient');

const addRevenueShare = async (refund) => {
  const vendor = await Vendor.findUnique({ where: { id: refund.vendorId } });

  if (!vendor.revenueShareEnabled) {
    return null;
  }

  const existingRevenueShare = await RevenueShare.findFirst({
    where: {
      refundId: refund.id,
    },
  });

  if (existingRevenueShare) {
    return null;
  }
  const revenueShareAmount =
    refund.amount * (vendor.revenueSharePercentage / 100);

  const revenueShare = await RevenueShare.create({
    data: {
      amount: revenueShareAmount,
      percentage: vendor.revenueSharePercentage || 0,
      vendorId: refund.vendorId,
      refundId: refund.id,
    },
  });

  await Vendor.update({
    where: { id: vendor.id },
    data: {
      totalRevenueShareAmount: { increment: revenueShareAmount },
    },
  });

  return revenueShare;
};

const markRevenueSharesWithHasPaidInvoice = async (invoiceId, vendorId) => {
  const revenueShareAmount = parseFloat(
    (
      await RevenueShare.aggregate({
        where: {
          refund: {
            invoiceId,
          },
          hasPaidInvoice: false,
        },
        _sum: {
          amount: true,
        },
      })
    )._sum.amount
  );

  await RevenueShare.updateMany({
    where: {
      refund: {
        invoiceId,
      },
      hasPaidInvoice: false,
    },
    data: {
      hasPaidInvoice: true,
    },
  });

  await Vendor.update({
    where: { id: vendorId },
    data: {
      availableRevenueShareAmount: { increment: revenueShareAmount },
    },
  });

  return true;
};

module.exports = {
  addRevenueShare,
  markRevenueSharesWithHasPaidInvoice,
};
