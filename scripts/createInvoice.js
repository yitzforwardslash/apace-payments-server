const prisma = require('../prisma/prismaClient');
const moment = require('moment');
const { generateInvoices } = require('../modules/invoice/invoice.service');
const logger = require('../utils/Logger');

module.exports = async () => {
  console.log('Started create invoice script');
  const yesterday = moment().subtract(1, 'day').endOf('day').toDate();
  const tenDaysAgo = moment().subtract(15, 'days').endOf('day').toDate();
  const vendorIds = (
    await prisma.vendor.findMany({
      where: {
        OR: [
          {
            invoicingCycleType: 'Daily',
            lastInvoicedAt: { lte: yesterday },
          },
          {
            invoicingCycleType: 'BiWeekly',
            lastInvoicedAt: { lte: tenDaysAgo },
          },
        ],
      },
      select: { id: true },
    })
  ).map((vendor) => vendor.id);
  console.log('Invoicing', vendorIds.length, 'vendors')
  await Promise.all(vendorIds.map((vendorId) => generateInvoices(vendorId)));
  console.log('Ended create invoice script');
};
