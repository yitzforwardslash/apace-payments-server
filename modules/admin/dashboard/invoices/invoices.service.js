const {
  invoice: Invoice,
  vendor: Vendor,
} = require('../../../../prisma/prismaClient');
const { NotFoundError } = require('../../../../utils/CustomError');
const { getDateRangeFilter, preparePagination } = require('../../admin.utils');
const { calculatenNextCursor } = require('../../../../utils/Pagination');
const { logError, logInfo } = require('../../logs/logs.service');
const QuickBooks = require('../../../../utils/QuickBooks');
const {
  getQuickbookData,
  getUndepositedFundsAccount,
} = require('../../../quckbooks/quickbooks.service');
const {
  getOverdueInvoicesWhereFilter,
  getDueInvoicesWhereFilter,
} = require('./invoices.utils');
const generateVendorInvoice = require('../../../../message-broker/publishers/generateVendorInvoice');
const { markRevenueSharesWithHasPaidInvoice } = require('../../../vendor/revenueShare/revenueShareService');

const retrieveOverdueInvoicesTotalAmount = async (vendorId = null) => {
  const whereData = getOverdueInvoicesWhereFilter();

  vendorId ? (whereData.vendorId = vendorId) : '';

  const overdueInvoicesTotalAmount = await Invoice.aggregate({
    where: whereData,
    _sum: {
      totalAmount: true,
    },
  });

  return overdueInvoicesTotalAmount._sum.totalAmount || 0;
};

const retrieveDueInvoicesTotalAmount = async (vendorId = null) => {
  const whereData = getDueInvoicesWhereFilter();

  vendorId ? (whereData.vendorId = vendorId) : '';

  const dueInvoicesTotalAmount = await Invoice.aggregate({
    where: whereData,
    _sum: {
      totalAmount: true,
    },
  });

  return dueInvoicesTotalAmount._sum.totalAmount || 0;
};

const retrievePaidInvoicesTotalAmount = async (dates, vendorId = null) => {
  let whereData = getDateRangeFilter(dates, 'createdAt');

  vendorId ? (whereData.vendorId = vendorId) : '';

  const paidInvoicesTotalAmount = await Invoice.aggregate({
    where: {
      status: 'paid',
      ...whereData,
    },
    _sum: {
      totalAmount: true,
    },
  });

  return paidInvoicesTotalAmount._sum.totalAmount || 0;
};

const retrieveInvoices = async (cursor, pageLength, page, whereData = null) => {
  const totalCount = await Invoice.count({
    where: whereData ?? {},
  });

  const paginationData = preparePagination(
    cursor,
    pageLength,
    totalCount,
    page
  );

  const invoices = await Invoice.findMany({
    where: whereData ?? {},
    ...paginationData.pagination,
    include: {
      vendor: {
        select: {
          id: true,
          ownerFirstName: true,
          ownerLastName: true,
          email: true,
        },
      },
      refunds: {
        select: {
          id: true,
          refundNumber: true,
        },
      },
    },
  });

  return {
    invoices,
    totalCount,
    totalPages: paginationData.totalPages,
    nextCursor: calculatenNextCursor(invoices),
    currentPage: Number.parseInt(page),
  };
};

const retrieveInvoiceById = async (id) => {
  const invoice = await Invoice.findUnique({
    where: { id },
    include: {
      vendor: true,
      refunds: {
        include: {
          refundItems: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new NotFoundError('invoice');
  }

  return invoice;
};

const markInvoiceAsPaid = async (id, data, updatedBy) => {
  const invoice = await Invoice.findUnique({ where: { id } });

  try {
    const updateData = {
      status: 'paid',
      paymentMethod: data.paymentMethod,
      notes: data.referenceAndNotes,
    };
    const quickbooksData = await getQuickbookData();

    if (quickbooksData.token && invoice.quickbooksId) {
      const account = await getUndepositedFundsAccount();

      const updatedQBInvoice = await QuickBooks.updateInvoice(
        JSON.parse(quickbooksData.token),
        quickbooksData.realmId,
        invoice.quickbooksId,
        invoice.quickbooksSyncToken,
        {
          Deposit: invoice.totalAmount,
          DepositToAccountRef: {
            value: account.quickbooksId,
            name: account.quickbooksName,
          },
        }
      );

      updateData.quickbooksSyncToken = updatedQBInvoice.SyncToken;
    }

    const updatedInvoice = await Invoice.update({
      where: { id },
      data: updateData,
    });
    await markRevenueSharesWithHasPaidInvoice(id, invoice.vendorId);

    await logInfo({
      action: 'update',
      description: 'Mark Invoice As Paid',
      model: 'invoice',
      actionOn: id.toString(),
      updatedBy,
      updatedFields: ['status', 'paymentMethod', 'notes'],
      oldValues: {
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        notes: invoice.notes,
      },
      newValues: {
        status: updatedInvoice.status,
        paymentMethod: updatedInvoice.paymentMethod,
        notes: updatedInvoice.notes,
      },
    });

    return updatedInvoice;
  } catch (error) {
    await logError({
      action: 'update',
      model: 'invoice',
      description: JSON.stringify(error),
      actionOn: id.toString(),
      updatedBy,
    });
    throw new Error('Error while updating invoice.');
  }
};

const generateInvoicesForVendors = async ({ dueDate, vendorIds }) => {
  const where = {
    refunds: {
      some: { invoiceId: null, status: { equals: 'processed' } },
    },
  };

  if (vendorIds && Array.isArray(vendorIds)) {
    where.id = {
      in: vendorIds,
    };
  }

  const vendors = await Vendor.findMany({
    where,
    select: {
      id: true,
    },
  });
  console.log(`Generating invoices for ${vendors.length} vendors`);
  console.dir({ where }, { depth: null });
  await Promise.all(
    vendors.map((vendor) => generateVendorInvoice(vendor.id, { dueDate }))
  );

  return true;
};

module.exports = {
  retrieveDueInvoicesTotalAmount,
  retrieveOverdueInvoicesTotalAmount,
  retrievePaidInvoicesTotalAmount,
  retrieveInvoices,
  retrieveInvoiceById,
  markInvoiceAsPaid,
  generateInvoicesForVendors,
};
