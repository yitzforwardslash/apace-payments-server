const envPath = `.env${process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : ''}`
console.log('Loading env variables from ', envPath);
require('dotenv').config({ path: envPath });
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');
const appendFilesToBody = require('./middlewares/appendFilesToBody');
const apiRouter = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
// const Dwolla = require('./utils/Dwolla');
// Dwolla.findMasterBalance();
// Dwolla.syncWebhook();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],
  environment: process.env.NODE_ENV,
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.set('trust proxy', true);
app.use(cors());
app.use(express.json({limit: '2mb'}));
app.use(fileUpload(), appendFilesToBody);

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  {
    flags: 'a',
  }
);

app.get('/', (req, res) => res.sendStatus(200))

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (process.env.NODE_ENV === 'production') {
  app.use(morgan('dev'));
}

const swaggerUi = require('swagger-ui-express')


app.use('/doc', swaggerUi.serve, swaggerUi.setup(require('./docs')))

app.use('/', apiRouter);

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

app.use(errorHandler);

module.exports = app;
