const RabbitMQ = require('../../utils/RabbitMQ')
const vendorService = require('../vendor/vendor.service')

module.exports.ensureQueues = async () => {
  const vendorIds = await vendorService.getAllVendors()
  return RabbitMQ.then((connection) => connection.createChannel()).then(
    async (channel) => {
      const queues = vendorIds.map((vendorId) =>
        channel.assertQueue(`webhook-vendor-${vendorId}`, { durable: true })
      )
      await Promise.all(queues.concat([
        channel.assertQueue(`refund-webhook-vendor`, { durable: true }),
        channel.assertQueue(`sync-refund-status`, { durable: true }),
      ]))
      return Promise.resolve()
    }
  )
}
