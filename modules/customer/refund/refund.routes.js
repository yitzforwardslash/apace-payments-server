const router = require('express').Router({ mergeParams: true });
const customerAuthentication = require('../../../middlewares/customerAuthentication');
const refundController = require('./refund.controller');

// Gets all refunds for this vendor
router.get('/', customerAuthentication, refundController.getRefunds);

router.get('/stats', customerAuthentication, refundController.getStats);

router.get('/:refundId', customerAuthentication, refundController.getRefundDetails);
// // If refund details request.refundId is null, it should be a vendor request, go to next
// router.get(
//   '/:refundId',
//   refundController.getRefundData
// );

module.exports = router;
