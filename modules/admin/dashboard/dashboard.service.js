const fs = require('fs');
const path = require('path');
const async = require('async');
const moment = require('moment');
const storageService = require('../../storage/storage.service');
const parseFloatNumber = require('../../../utils/ParseFloatNumber');
const {
  vendor: Vendor,
  customer: Customer,
  refund: Refund,
  invoice: Invoice,
} = require('../../../prisma/prismaClient');
const AptPay = require('../../../utils/AptPay');
const { getFieldValue } = require('../../../utils/getFieldValue');
const { getDueTodayInvoicesWhereFilter } = require('./invoices/invoices.utils');

const retrieveBalance = async () => {
  return parseFloatNumber(await AptPay.getAvailableBalance());
};

const CSVEntityFields = {
  customers: [
    'id',
    'email',
    'firstName',
    'lastName',
    'phone',
    'ssnLastFour',
    'dob',
    'address1',
    'address2',
    'city',
    'state',
    'zip',
    'aptpayId',
    'aptpayStatus',
    'aptpayErrorCode',
  ],
  vendors: [
    'id',
    'email',
    'commercialName',
    'ownerFirstName',
    'ownerLastName',
    'website',
    'industry',
    'concent',
    'avg_monthly_refunds',
    'allow_notify',
    'allow_twostepverify',
    'allow_autopay',
    'revenueShareEnabled',
    'revenueSharePercentage',
    'ecommerce_platform',
    'phone',
    'profilePictureUrl',
    'logoUrl',
    'entity',
    'ein',
    'annualRevenue',
    'dailyReturns',
    'avgItemPrice',
    'aptpayId',
    'quickbooksId',
    'quickbooksSyncToken',
    'stripeId',
    'street_1',
    'city',
    'state',
    'zip',
    'country',
    'owner_firstname',
    'owner_lastname',
    'owner_dob',
    'owner_phone',
    'invoicingCycleType',
    'lastInvoicedAt',
    'totalRevenueShareAmount',
    'availableRevenueShareAmount',
    'paidRevenueShareAmount',
    'invoiceDueInterval',
    'status',
    'approvedByDNB',
    'createdAt',
  ],
  refunds: [
    'id',
    'refundNumber',
    'amount',
    'refundDate',
    'expirationDate',
    'expired',
    'disabled',
    'isPartialRefund',
    'orderId',
    'orderUrl',
    'productIds',
    'orderDate',
    'cardLastFour',
    'cardType',
    'cardLastFourVerified',
    'status',
    'agreementDate',
    'termsDate',
    'refundLink',
    'customerEmail',
    'customerFName',
    'customerLName',
    'emailSent',
    'emailSentAt',
    'emailOpenedAt',
    'linkClickedAt',
    'refundDepositedAt',
    'lastStep',
    'createdAt',
  ],
  invoices: [
    'id',
    'invoiceNumber',
    'date',
    'totalAmount',
    'status',
    'quickbooksId',
    'quickbooksSyncToken',
    'chargeId',
    'dueDate',
    'transaction',
    'paymentMethod',
    'notes',
  ],
};

const downloadEntityAsCSV = async ({ entity, from, to }) => {
  if (to) {
    to = new Date(to);
  } else if (!to) {
    to = new Date();
  }

  const whereData = {
    AND: [
      {
        createdAt: { lte: to },
      },
    ],
  };
  if (from) {
    whereData.AND.push({
      createdAt: { gte: new Date(from) },
    });
  }

  let entityModel;
  switch (entity) {
    case 'customers':
      entityModel = Customer;
      break;
    case 'vendors':
      entityModel = Vendor;
      break;
    case 'refunds':
      entityModel = Refund;
      break;
    case 'invoices':
      entityModel = Invoice;
      break;
  }

  const count = await entityModel.count({ where: whereData });

  const fileName = `${entity}_${Date.now()}.csv`;
  const filePath = path.join(__dirname, fileName);
  const fileStream = fs.createWriteStream(filePath);

  const fields = CSVEntityFields[entity];

  await new Promise((resolve) =>
    fileStream.write(
      (['refunds', 'invoices'].includes(entity)
        ? ['vendor', ...fields]
        : fields
      ).join(',') + '\n',
      resolve
    )
  );

  const extractInfoFuncArray = [];
  const perCycle = 200;

  for (let i = 0; i < count; i += perCycle) {
    extractInfoFuncArray.push(async () => {
      try {
        let items = [];
        switch (entity) {
          case 'invoices':
          case 'refunds':
            items = await entityModel.findMany({
              where: whereData,
              take: perCycle,
              skip: i,
              include: { vendor: { select: { commercialName: true } } },
            });

            break;
          default:
            items = await entityModel.findMany({
              where: whereData,
              take: perCycle,
              skip: i,
            });
        }
        const itemsLines = [];
        items.forEach((customer) => {
          const item = [];
          fields.forEach((key) => {
            item.push(getFieldValue(customer, key));
          });
          if (['refunds', 'invoices'].includes(entity)) {
            item.unshift(customer.vendor.commercialName);
          }
          itemsLines.push(item.join(','));
        });

        await new Promise((resolve) =>
          fileStream.write(itemsLines.join('\n'), resolve)
        );
      } catch (err) {
        console.log(err);
      }

      await new Promise((resolve) => fileStream.write('\n', resolve));
    });
  }

  await new Promise((resolve, reject) => {
    async.parallelLimit(extractInfoFuncArray, 1, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

  const fileKey = await storageService.uploadFile(filePath, fileName);
  const url = `${process.env.API_URL}storage${fileKey}`;

  fs.unlink(filePath, () => {});

  return url;
};

const getDueTodayInvoiceAmount = async () => {
  const whereData = getDueTodayInvoicesWhereFilter();

  const result = await Invoice.aggregate({
    where: whereData,
    _sum: { totalAmount: true },
  });

  return parseFloatNumber(result._sum.totalAmount || 0);
};

const getOverdueInvoiceAmount = async () => {
  const startOfDay = moment().startOf('day').toDate();

  const result = await Invoice.aggregate({
    where: {
      status: 'unpaid',
      dueDate: { lte: startOfDay },
    },
    _sum: { totalAmount: true },
  });

  return parseFloatNumber(result._sum.totalAmount || 0);
};

module.exports = {
  retrieveBalance,
  downloadEntityAsCSV,
  getDueTodayInvoiceAmount,
  getOverdueInvoiceAmount,
};
