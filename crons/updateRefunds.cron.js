var cron = require('node-cron');

const updateRefundsScript = require('../scripts/updateRefundStatus');

cron.schedule(
  '*/5 * * * *',
  () => {
    console.log(
      '============== Start update refund script cron job ========================'
    );
    try {
      updateRefundsScript();
    } catch (err) {console.log(err)}
    console.log(
      '============== End update refund script cron job ========================'
    );
  },
  {
    timezone: 'America/Los_Angeles',
  }
);

updateRefundsScript();
