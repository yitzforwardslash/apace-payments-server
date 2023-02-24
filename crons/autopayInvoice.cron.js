var cron = require('node-cron');
const momentTz = require('moment-timezone');
const { globalSiteSetting } = require('../prisma/prismaClient');
const autopayInvoiceScript = require('../scripts/autopayInvoices');
const defaultInvoicingTime = {
  minute: 0,
  hour: 20,
};
console.log('Scheduled cron for autopaying invoices');

cron.schedule(
  '* * * * *',
  async () => {
    const now = momentTz().tz('America/New_York');
    const nowH = now.hour();
    const nowM = now.minute();

    const invoicingTime = await globalSiteSetting.findUnique({
      where: {
        key: 'autopay_cron_time',
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
        '============== Start autpay invoice script cron job ========================'
      );
      autopayInvoiceScript();
      console.log(
        '============== End autopay invoice script cron job ========================'
      );
    }
  },
  {
    timezone: 'EST',
  }
);
