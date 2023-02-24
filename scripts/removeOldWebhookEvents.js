const {
  deleteOldEvents,
} = require('../modules/webhookEvent/webhookEvent.service');
const logger = require('../utils/Logger');

module.exports = async () => {
  const before60Days = new Date();
  before60Days.setDate(before60Days.getDate() - 60);
  const deletedCount = await deleteOldEvents(before60Days);
  logger.info(
    `Successfully deleted ${deletedCount} events that has been used from more than 60 days`
  );
};
