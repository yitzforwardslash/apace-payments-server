const prisma = require('../prisma/prismaClient');
const moment = require('moment');
const payVendorInvoice = require('../message-broker/publishers/payVendorInvoice');

module.exports = async () => {
  console.log('Started autopay invoice script');
  const invoicesWhere = {
    status: 'unpaid',
    dueDate: {
      lte: moment().utc().endOf('day').toDate(),
    },
  };
  const vendors = await prisma.vendor.findMany({
    where: {
      allow_autopay: true,
      invoices: {
        some: {
          ...invoicesWhere,
        },
      },
    },
    include: {
      invoices: { where: { ...invoicesWhere } },
    },
  });

  const vendorInvoiceIds = [];

  vendors.forEach((vendor) => {
    vendor.invoices.forEach((invoice) => {
      vendorInvoiceIds.push({
        vendorId: vendor.id,
        invoiceId: invoice.id,
      });
    });
  });


  console.log('autopaying', vendorInvoiceIds.length, 'vendors');
  vendorInvoiceIds.forEach(item => {
    payVendorInvoice(item.vendorId, item.invoiceId)
  })
  console.log('Ended autopay invoice script');
};
