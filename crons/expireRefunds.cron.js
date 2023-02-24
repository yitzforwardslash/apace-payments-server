var cron = require('node-cron');

const expireRefundsScript = require('../scripts/expireRefunds');

console.log('Scheduled cron for expiring refunds')
cron.schedule(
  '*/10 * * * *',
  () => {
    console.log(
      '============== Start expire refunds script cron job ========================'
    );
    expireRefundsScript();
    console.log(
      '============== End expire refunds script cron job ========================'
    );
  },
  {
    timezone: 'EST'
  }
  
);
