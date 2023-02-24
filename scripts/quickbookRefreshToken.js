const prisma = require('../prisma/prismaClient');
const logger = require('../utils/Logger');
const quickbookService = require('../modules/quckbooks/quickbooks.service');
const QuickBooks = require('../utils/QuickBooks');

module.exports = async () => {
  console.log('Started refresh quickbook token');
  const data = await quickbookService.getQuickbookData();
  if (data && data.token && data.realmId) {
    try {
      const token = await QuickBooks.refreshAccessToken(
        JSON.parse(data.token).refresh_token
      );
      await quickbookService.saveToken(
        JSON.stringify({ ...token, createdAt: Date.now() }),
        data.realmId
      );
      console.log('Quickbook token refreshed');
    } catch (err) {
      console.log(err);
    }
  } else {
    console.log('Quickbook not configured, cannot refresh token');
  }
  console.log('Ended refresh quickbook token script');
};
