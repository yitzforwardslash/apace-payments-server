var cron = require('node-cron');

const quickbookRefreshToken = require('../scripts/quickbookRefreshToken');

console.log('Scheduled cron for refreshing quickbooks token');
cron.schedule(
  '*/10 * * * *',
  () => {
    console.log(
      '============== Start refresh quickbook token ========================'
    );
    try {
      quickbookRefreshToken();
    } catch (err) {
      console.log(err);
    }
    console.log(
      '============== End refresh quickbook token ========================'
    );
  },
  {
    timezone: 'EST',
  }
);
