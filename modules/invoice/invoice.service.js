const {
  invoice: Invoice,
  refund: Refund,
  vendorPaymentMethod: VendorPaymentMethod,
  globalSiteSetting: GlobalSiteSetting,
} = require('../../prisma/prismaClient');
const {
  getNotInvoicedRefunds,
  getNotInvoicedRefundsAmount,
} = require('../vendor/refund/refund.service');
const { getVendor, updateLastInvoicedAt } = require('../vendor/vendor.service');
const {
  calculateTotalPages,
  calculatenNextCursor,
} = require('../../utils/Pagination');
const Dwolla = require('../../utils/Dwolla');
const logger = require('../../utils/Logger');
const ParseFloatNumber = require('../../utils/ParseFloatNumber');
const QuickBooks = require('../../utils/QuickBooks');
const moment = require('moment');
const {
  getQuickbookData,
  getUndepositedFundsAccount,
} = require('../quckbooks/quickbooks.service');
const Stripe = require('../../utils/Stripe');
const { calculateRefund } = require('../vendor/refund/refund.utils');
const AptPay = require('../../utils/AptPay');
const Encrypt = require('../../utils/Encrypt');
const {
  markRevenueSharesWithHasPaidInvoice,
} = require('../vendor/revenueShare/revenueShareService');

module.exports.calculateInvoiceFees = (invoice) =>
  invoice.totalAmount * 0.029 + 0.03;
module.exports.calculateInvoiceTotal = (invoice) => {
  const fees = invoice.totalAmount * 0.029 + 0.03;
  return ParseFloatNumber(invoice.totalAmount + fees);
};

module.exports.generateQuickbooksInvoiceLines = async (refundsToBeAdded) => {
  function generteGroupLineDetailLine(description, amount) {
    return {
      Description: description,
      Amount: amount,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        TaxInclusiveAmt: amount,
        Qty: 1,
        UnitPrice: amount,
      },
    };
  }
  const lines = [];
  const refunds = await Refund.findMany({
    where: { id: { in: refundsToBeAdded } },
  });
  const aptpayFee = await GlobalSiteSetting.findUnique({
    where: { key: 'aptpay_fee' },
  });
  if (!aptpayFee) {
    throw new Error('Cant find aptpay fees');
  }
  if (!process.env.QUICKBOOKS_REFUND_BUNDLE_ID) {
    throw new Error('Cant find bundle QUICKBOOKS_REFUND_BUNDLE_ID');
  }
  const quickbooksData = await getQuickbookData();
  const groupItem = await QuickBooks.getItem(
    JSON.parse(quickbooksData.token),
    quickbooksData.realmId,
    process.env.QUICKBOOKS_REFUND_BUNDLE_ID
  );

  for await (const refund of refunds) {
    const refundFees =
      refund.feeAmount ||
      refund.amount - (await calculateRefund(refund.vendorId, refund.amount));

    const line = {
      DetailType: 'GroupLineDetail',
      Description: `Refund URL: ${process.env.APACE_ADMIN_REFUND_URL}/${refund.id}`,
      GroupLineDetail: {
        Quantity: 1,
        GroupItemRef: {
          value: groupItem.Id,
          name: groupItem.Name,
        },
        Line: [
          {
            ...generteGroupLineDetailLine('Merchant Refund', refund.amount),
            SalesItemLineDetail: { ServiceDate: refund.refundDate },
          },
        ].concat(
          [
            { Description: 'Consumer Refund Fee', Amount: refundFees },
            {
              Description: 'APT Pay Fee',
              Amount: -ParseFloatNumber(aptpayFee.value),
            },
            {
              Description: 'Fee Reversal',
              Amount: -(refundFees - ParseFloatNumber(aptpayFee.value)),
            },
          ].map((item) =>
            generteGroupLineDetailLine(item.Description, item.Amount)
          )
        ),
      },
    };
    lines.push(line);
  }

  return lines;
};

/**
 * @param {String} vendorId
 * @param {Date} fromDate
 * @param {Date} toDate
 */
module.exports.generateInvoices = async (vendorId, { dueDate } = {}) => {
  if (!vendorId) {
    throw new Error('Please provide correct arguments for generating invoice');
  }
  const refundsToBeAdded = await getNotInvoicedRefunds(vendorId);
  if (!refundsToBeAdded.length) {
    logger.info("There's no refunds to be invoiced for vendor:", vendorId);
    return;
  }
  const refundsIds = refundsToBeAdded.map((refund) => ({ id: refund.id }));
  const totalInvoiceAmount = ParseFloatNumber(
    refundsToBeAdded.reduce(
      (sum, currentRefund) => +sum + +currentRefund.amount,
      0
    )
  );
  const invoiceDueDate = dueDate
    ? moment(new Date(dueDate)).utc().toDate()
    : await calculateInvoiceDueDate(vendorId);
  const invoiceNumber = await this.calculateNextInvoiceNumber(vendorId);

  const invoice = await Invoice.create({
    data: {
      invoiceNumber,
      refunds: { connect: refundsIds },
      totalAmount: totalInvoiceAmount,
      date: new Date(),
      dueDate: invoiceDueDate,
      vendorId,
    },
  });

  const vendor = await getVendor({ id: vendorId });
  try {
    const quickbooksData = await getQuickbookData();

    if (quickbooksData.token) {
      const Line = await this.generateQuickbooksInvoiceLines(
        refundsToBeAdded.map((refund) => refund.id)
      );

      const quickbooksInvoice = await QuickBooks.createInvoice(
        JSON.parse(quickbooksData.token),
        quickbooksData.realmId,
        {
          CustomerRef: { value: vendor.quickbooksId },
          Line,
          PrivateNote: `${process.env.APACE_ADMIN_INVOICE_URL}/${invoice.id}`,
          DueDate: moment(invoiceDueDate).format('YYYY-MM-DD'),
          DocNumber: invoice.id.toString(),
        }
      );

      await Invoice.update({
        where: { id: invoice.id },
        data: {
          quickbooksId: quickbooksInvoice.Id,
          quickbooksSyncToken: quickbooksInvoice.SyncToken,
        },
      });
    }
  } catch (err) {
    try {
      console.dir(err.response.data, { depth: null });
    } catch (e) {
      console.log(err);
    }
  }
  await updateLastInvoicedAt(vendorId, new Date());
};

module.exports.getVendorInvoicingSummary = async (vendorId) => {
  const vendor = await getVendor({ id: vendorId });

  const endDate = moment(vendor.lastInvoicedAt).add(
    vendor.invoicingCycleType === 'BiWeekly' ? 14 : 1,
    'days'
  );
  const { sum, count } = await getNotInvoicedRefundsAmount(vendorId);
  const predictedRevenueShareAmount = vendor.revenueShareEnabled
    ? ParseFloatNumber((sum * vendor.revenueSharePercentage) / 100)
    : 0;

  return {
    billingCycle: vendor.invoicingCycleType,
    startDate: vendor.lastInvoicedAt,
    endDate: endDate.toDate(),
    dueDate: endDate.clone().add(1, 'days').toDate(),
    amount: sum,
    refunds: count,
    predictedRevenueShareAmount,
  };
};

module.exports.getVendorInvoices = async (vendorId, cursor, pageLength) => {
  if (!pageLength) {
    pageLength = 10;
  }
  const totalCount = await Invoice.count({ where: { vendorId } });
  const totalPages = calculateTotalPages(totalCount, pageLength);
  let invoices;
  if (!cursor || cursor === 0) {
    invoices = await Invoice.findMany({
      take: pageLength,
      where: { vendorId },
      orderBy: { id: 'desc' },
      include: {
        refunds: true,
        paymentCard: {
          select: {
            id: true,
            name: true,
            lastFour: true,
            firstSix: true,
            network: true,
          },
        },
      },
    });
  } else {
    invoices = await Invoice.findMany({
      take: pageLength,
      skip: 1,
      cursor: { id: cursor },
      where: { vendorId },
      orderBy: { id: 'desc' },
      include: {
        refunds: true,
        paymentCard: {
          select: {
            id: true,
            name: true,
            lastFour: true,
            firstSix: true,
            network: true,
          },
        },
      },
    });
  }
  invoices.forEach((invoice) => {
    invoice.refundsCount = invoice.refunds.length;
    delete invoice.refunds;
  });
  return {
    invoices,
    totalCount,
    totalPages,
    nextCursor: calculatenNextCursor(invoices),
  };
};

module.exports.getInvoiceById = (invoiceId, vendorId) =>
  Invoice.findFirst({
    where: { id: invoiceId, vendorId },
    include: {
      paymentCard: {
        select: {
          id: true,
          name: true,
          lastFour: true,
          firstSix: true,
          network: true,
        },
      },
    },
  });

module.exports.payInvoice = async (
  invoiceId,
  vendorId,
  paymentMethodId = null
) => {
  const invoice = await Invoice.findFirst({
    where: { id: invoiceId, vendorId },
    include: {
      vendor: {
        include: {
          defaultPaymentMethod: {
            include: {
              vendorCard: true,
              vendorBankAccount: true,
            },
          },
        },
      },
    },
  });

  let paymentMethod = invoice.vendor.defaultPaymentMethod;
  if (paymentMethodId) {
    paymentMethod = await VendorPaymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        vendorId,
      },
      include: {
        vendorCard: true,
        vendorBankAccount: true,
      },
    });
  }
  if (!paymentMethod) {
    throw new Error(
      'Cannot proceed without payment method, please set a primary payment method'
    );
  }

  const quickbooksData = await getQuickbookData();
  const invoiceFees = this.calculateInvoiceFees(invoice);
  let chargeId = '';
  let chargeStatus = 'unpaid';
  let chargeProcessor = 'stripe';
  let status = '';
  const chargeAmount = ParseFloatNumber(
    ParseFloatNumber(invoice.totalAmount) + invoiceFees
  );
  try {
    if (process.env.NODE_ENV !== 'development') {
      if (paymentMethod.type === 'card') {
        const charge = await Stripe.createCharge(
          invoice.vendor.stripeId,
          paymentMethod.vendorCard.stripeId,
          chargeAmount,
          `Apace Refunds - ${invoice.vendor.commercialName}: charge for invoice #${invoice.id}`
        );
        chargeId = charge.id;
        chargeProcessor = 'stripe';
        chargeStatus = charge.status;
        if (chargeStatus === 'succeeded') {
          status = 'paid';
        } else if (chargeStatus === 'pending') {
          status = 'pending';
        }
      } else if (paymentMethod.type === 'bank') {
        const bankAccount =
          paymentMethod.vendorBankAccount;
        const result = await AptPay.createBankAccountACHDebit({
          identityId: invoice.vendor.aptpayId,
          amount: Number.parseFloat(chargeAmount),
          currency: 'USD',
          referenceId: `invoice|${invoice.id}`,
          routingNumber: Encrypt.decrypt(bankAccount.routingNumber),
          accountNumber: Encrypt.decrypt(bankAccount.accountNumber),
          custom1: `VendorId: ${invoice.vendor.id}`,
        });

        chargeId = result.id;
        chargeStatus = result.status;
        chargeProcessor = 'aptpay';
        status = 'pending';
      }
    } else {
      status = 'paid'
    }
    // mark invoice as paid
    await Invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        chargeId,
        chargeProcessor,
        chargeStatus,
        vendorPaymentMethod: { 
          connect: {
            id: paymentMethod.id,
          }
        }
      },
    });
    if (status === 'paid') {
      await markRevenueSharesWithHasPaidInvoice(invoiceId, vendorId);
    }
  } catch (err) {
    console.dir(err.response, { depth: null });
    throw err;
  }
  if (invoice && invoice.quickbooksId) {
    try {
      const account = await getUndepositedFundsAccount();
      const existingInvoice = await QuickBooks.getInvoice(
        JSON.parse(quickbooksData.token),
        quickbooksData.realmId,
        invoice.quickbooksId
      );
      // we update the invoice in 2 steps
      // first add a line item for the fees
      // then set the deposit amount
      let updatedInvoice = await QuickBooks.updateInvoice(
        JSON.parse(quickbooksData.token),
        quickbooksData.realmId,
        invoice.quickbooksId,
        invoice.quickbooksSyncToken,
        {
          Line: [
            ...existingInvoice.Line.filter(
              (line) => line.DetailType === 'SalesItemLineDetail'
            ),
            {
              DetailType: 'SalesItemLineDetail',
              Amount: invoiceFees,
              SalesItemLineDetail: {
                TaxInclusiveAmt: invoiceFees,
                Qty: 1,
                UnitPrice: invoiceFees,
              },
              Description: 'Card processing fees (2.9% + $0.3)',
            },
          ],
        }
      );
      await Invoice.updateMany({
        where: { id: invoiceId, vendorId },
        data: { quickbooksSyncToken: updatedInvoice.SyncToken },
      });

      const qbInvoice = await QuickBooks.getInvoice(
        JSON.parse(quickbooksData.token),
        quickbooksData.realmId,
        invoice.quickbooksId
      );

      updatedInvoice = await QuickBooks.updateInvoice(
        JSON.parse(quickbooksData.token),
        quickbooksData.realmId,
        invoice.quickbooksId,
        updatedInvoice.SyncToken,
        {
          Deposit: qbInvoice.Balance,
          DepositToAccountRef: {
            value: account.quickbooksId,
            name: account.quickbooksName,
          },
        }
      );
      await Invoice.updateMany({
        where: { id: invoiceId, vendorId },
        data: { quickbooksSyncToken: updatedInvoice.SyncToken },
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  return true;
};

module.exports.payAllUnpaidInvoices = async (vendorId) => {
  const unpaidInvoices = await Invoice.findMany({
    where: {
      vendorId,
      status: 'unpaid',
    },
  });

  await Promise.all(
    unpaidInvoices.map((invoice) => this.payInvoice(invoice.id, vendorId))
  );

  return true;
};

/**
 * @param {String} vendorId
 * @returns {Date}
 */
const calculateInvoiceDueDate = async (vendorId) => {
  const { invoicingCycleType } = await getVendor({ id: vendorId });
  if (!invoicingCycleType) {
    throw new Error(
      `Can not find vendor that has an id: ${vendorId} during calculating invoice due date!!`
    );
  }

  let dueDate = moment();
  if (invoicingCycleType === 'BiWeekly') {
    dueDate = dueDate.add(1, 'day').utc();
  } else if (invoicingCycleType === 'Daily') {
    dueDate = dueDate.add(1, 'hour').utc();
  }

  return dueDate.toDate();
};

/**
 *
 * @param {String} vendorId
 * @returns {Number}
 */
module.exports.calculateNextInvoiceNumber = async (vendorId) => {
  const latestInvoice = await Invoice.findFirst({
    where: {
      vendorId,
    },
    orderBy: { createdAt: 'desc' },
  });

  const nextInvoiceNumber = latestInvoice
    ? latestInvoice.invoiceNumber + 1
    : 1000;

  return nextInvoiceNumber;
};

/**
 * @param {{
 *  vendorId: string,
 *  startDate: Date,
 *  endDate: Date,
 *  status: import("@prisma/client").InvoiceStatus
 * }}
 */
module.exports.getInvoicesStats = ({
  vendorId,
  startDate = new Date('1970'),
  endDate = new Date(),
  status = 'unpaid',
}) =>
  Invoice.aggregate({
    _sum: { totalAmount: true },
    where: {
      vendorId,
      dueDate: { gt: startDate, lt: endDate },
      status: status,
    },
  }).then((result) => result._sum.totalAmount);

/**
 *
 * @param {Array<number>} invoiceIds
 * @param {String} vendorId
 * @param {Array<String>} fundingSources
 */
module.exports.payInvoices = async (invoiceIds, vendorId, fundingSources) => {
  const invoices = await Invoice.findMany({
    where: { id: { in: invoiceIds }, vendorId },
    select: { totalAmount: true },
  });

  const totalAmount = invoices.reduce(
    (prev, curr) => prev + curr.totalAmount,
    0
  );
  try {
    const transaction = await payFundingWithAvailableFundingSources(
      fundingSources,
      totalAmount
    );
    await Invoice.updateMany({
      where: { id: { in: invoiceIds } },
      data: { transaction: transaction.link },
    });
  } catch (error) {
    logger.error(error);
  }
};

/**
 *
 * @param {string[]} fundingSources
 * @param {number} totalAmount
 * @returns {Promise<{link: string, status: string}>}
 */
async function payFundingWithAvailableFundingSources(
  fundingSources,
  totalAmount
) {
  let transaction = null;
  for await (const fundingSource of fundingSources) {
    const responseTransaction = await Dwolla.createTransaction({
      transactionAmount: totalAmount,
      senderFund: fundingSource,
    });

    if (!['cancelled', 'failed'].includes(transaction.status)) {
      transaction = responseTransaction;
      break;
    }
  }
  return transaction;
}
