const Express = require('express');
const QuickBooks = require('../../utils/QuickBooks');
const quickbooksService = require('./quickbooks.service');

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
module.exports.getInfo = async (req, res, next) => {
  try {
    const { token, realmId } = await quickbooksService.getQuickbookData();
    if (!token || !realmId) {
      return res.json({ isConnected: false });
    }

    const info = await QuickBooks.getUserInfo(JSON.parse(token), realmId);
    return res.json({ isConnected: !!info, info });
  } catch (err) {
    next(err);
  }
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
module.exports.connectApp = async (req, res) => {
  if (req.query.secret !== process.env.QUICKBOOKS_CONNECTION_SECRET) {
    return res.status(403).json({ success: false });
  }

  const url = QuickBooks.generateAuthUrl();
  if (process.env.NODE_ENV === 'development') {
    return res.redirect(url);
  }

  return res.json({ url });
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
module.exports.handleCallback = async (req, res, next) => {
  try {
    const token = await QuickBooks.parseCallback(req.url);
    const { realmId } = req.query;
    await quickbooksService.saveToken(
      JSON.stringify({ ...token, createdAt: Date.now() }),
      realmId
    );
    QuickBooks.setToken(token);

    const info = await QuickBooks.getUserInfo(token, realmId);

    return res.json({ isConnected: !!info, info });
  } catch (err) {
    next(err);
  }
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
module.exports.handleWebhook = async (req, res, next) => {
  const isSignatureValid = QuickBooks.isWebhookSignatureValid(
    req.get('intuit-signature'),
    req.body
  );

  if (!isSignatureValid) {
    return res.status(401).send('FORBIDDEN');
  }

  try {
    if (req.body.eventNotifications && req.body.eventNotifications.length) {
      const entities = req.body.eventNotifications.reduce(
        (acc, item) => acc.concat(item.dataChangeEvent.entities),
        []
      );

      console.log({ entities });
      for await (const entity of entities) {
        try {
          if (entity.name === 'Payment') {
            await quickbooksService.handlePayment(entity.id);
          } else if (entity.name === 'Invoice') {
            await quickbooksService.syncInvoiceFromQuickbooks(entity.id);
          }
        } catch (err) {
          console.log(err);
        }
      }
    }
  } catch (err) {
    console.dir(err, { depth: null });
  }

  return res.status(200).send('SUCCESS');
};
