const webhookConsumer = require('./webhook')
const { getAllVendors } = require('../../modules/vendor/vendor.service')
const refundWebhook = require('./refundWebhook')
const syncRefundStatus = require('./syncRefundStatus')
const generateVendorInvoices = require('./generateVendorInvoice')
const payVendorInvoice = require('./payVendorInvoice')

getAllVendors().then((vendorIds) =>
  Promise.all(
    [refundWebhook(), syncRefundStatus(), generateVendorInvoices(), payVendorInvoice()].concat(
      vendorIds.map((vendorId) => webhookConsumer(vendorId))
    )
  )
)
