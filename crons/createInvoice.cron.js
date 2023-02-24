var cron = require('node-cron');
const moment = require('moment');
const momentTz = require('moment-timezone');
const { globalSiteSetting } = require('../prisma/prismaClient');
const createInvoiceScript = require('../scripts/createInvoice');
const defaultInvoicingTime = {
  minute: 0,
  hour: 16,
};
console.log('Scheduled cron for invoices');

cron.schedule(
  '* * * * *',
  async () => {
    const now = momentTz().tz('America/New_York');
    const nowH = now.hour();
    const nowM = now.minute();

    const invoicingTime = await globalSiteSetting.findUnique({
      where: {
        key: 'invoicing_cron_time',
      },
    });

    let hour = defaultInvoicingTime.hour;
    let minute = defaultInvoicingTime.minute;

    if (
      invoicingTime &&
      invoicingTime.value &&
      invoicingTime.value.match(/^[\d]{2}:[\d]{2}$/)
    ) {
      hour = parseInt(invoicingTime.value.split(':')[0]);
      minute = parseInt(invoicingTime.value.split(':')[1]);
    }

    if (hour === nowH && minute === nowM) {
      console.log(
        '============== Start create invoice script cron job ========================'
      );
      createInvoiceScript();
      console.log(
        '============== End create invoice script cron job ========================'
      );
    }
  },
  {
    timezone: 'EST',
  }
);
