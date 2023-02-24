const {
  getAllPendingRefunds,
  updatePendingRefunds,
  sendFailureEmail,
  syncRefundStatus,
} = require('../modules/vendor/refund/refund.service');
const prisma = require('../prisma/prismaClient');
const Dwolla = require('../utils/Dwolla');
const logger = require('../utils/Logger');

module.exports = async () => {
  const processedRefunds = [];
  const failedRefunds = [];
  const pendingRefunds = await getAllPendingRefunds();
  logger.info(`Syncing refund status for ${pendingRefunds.length} refunds`);

  const updatedStatuses = await Promise.all(
    pendingRefunds.map((refund) => syncRefundStatus(refund.id))
  );
  // pendingRefunds.forEach((refund, index) => {
  //   if (updatedStatuses[index] === 'processed') {
  //     processedRefunds.push(refund.id);
  //   }
  //   if (updatedStatuses[index] === 'failed') {
  //     failedRefunds.push(refund.id);
  //   }
  // });
  // if (processedRefunds.length > 0) {
  //   const { count } = await updatePendingRefunds(processedRefunds, 'processed');
  //   logger.info('Updated successfully', count, ' Refunds to processed');
  // }
  // if (failedRefunds.length > 0) {
  //   const { count } = await updatePendingRefunds(failedRefunds, 'failed');
  //   logger.info('Updated successfully', count, ' Refunds to processed');
  //   // fire send failure emails
  //   await Promise.all(
  //     failedRefunds.map((refund) => sendFailureEmail({ refundId: refund.id }))
  //   );
  // }
  logger.info(
    `Successfully run update refund at ${new Date().toLocaleString()} with ${
      pendingRefunds.length
    } pending before it`
  );
  logger.info({ updatedStatuses });
  // await prisma.$disconnect();
  // process.exit(0);
};
