const app = require('./app')
const PORT = process.env.PORT || 80
const { ensureQueues } = require('./modules/webhook/webhook.utils')
const logger = require('./utils/Logger')

app.listen(PORT, async () => {
  await ensureQueues()

  // require('./crons/autopayInvoice.cron')
  // require('./crons/createInvoice.cron')
  // require('./crons/updateRefunds.cron')
  // require('./crons/expireRefunds.cron')
  // require('./crons/quickbooksRefreshToken.cron')

  require('./message-broker/consumers/index')
  logger.info(`Server is running at: http://localhost:${PORT}`)
})
