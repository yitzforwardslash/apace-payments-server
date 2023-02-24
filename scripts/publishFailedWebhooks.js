const {
  getFailedEvents,
} = require('../modules/webhookEvent/webhookEvent.service');
const webhookPublisher = require('../message-broker/publishers/webhook');
const logger = require('../utils/Logger');

module.exports = async () => {
  const failedEvents = await getFailedEvents();
  logger.info('Trying to publish all failed events:', failedEvents);
  const publishPromises = Object.keys(failedEvents).map((vendorId) =>
    webhookPublisher(vendorId, failedEvents[vendorId])
  );
  try {
    await Promise.all(publishPromises);
    logger.info('Successfully published all failed events:', failedEvents);
  } catch (error) {
    logger.error('Failed to publish failed events', error);
  }
};
