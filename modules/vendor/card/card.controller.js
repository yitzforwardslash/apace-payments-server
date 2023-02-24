const AptPay = require('../../../utils/AptPay');
const vendorService = require('../vendor.service');
const cardService = require('./card.service');
const logger = require('../../../utils/Logger');
const Stripe = require('../../../utils/Stripe');
const Encrypt = require('../../../utils/Encrypt');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
const createNewCard = async (request, response, next) => {
  // Reformat expiration date to match aptpay
  const [MM, YY] = request.body.expirationDate.split('/').map((i) => i.trim());
  const currentYear = new Date().getFullYear().toString();

  request.body.expirationDate = `${currentYear.substr(
    0,
    currentYear.length - 2
  )}${YY}-${MM}`;

  const { number, expirationDate } = request.body;

  try {
    const cardValidation = await AptPay.validateCard({
      amount: 0.5,
      currency: 'USD',
      disbursementNumber: number,
      expirationDate,
    });

    if (!cardValidation.type) {
      console.dir({ cardValidation }, { depth: null });
      return response.status(400).send({
        success: false,
        message: 'CARD_ERROR',
      });
    }

    if (!cardValidation.receiving) {
      return response.status(400).send({
        success: false,
        message: 'NON_RECEIVING_CARD',
      });
    }

    if (cardValidation.type !== 'DEBIT' && cardValidation.type !== 'CREDIT') {
      return response.status(400).send({
        success: false,
        message: 'DEBIT_CARD_REQUIRED',
      });
    }

    const existingCard = await cardService.getVendorCardByNumber(number);
    if (existingCard) {
      return response.send({
        success: true,
        cardDetails: existingCard,
      });
    }
    const vendor = await vendorService.getVendor({ id: request.vendorId });
    logger.info(`Vendor id before add card ${request.vendorId}`)
    const cardDetails = await cardService.createNewCard(
      {
        ...request.body,
        type: cardValidation.type.toLowerCase(),
        network: cardValidation.network,
        fundsAvailability: cardValidation.funds_availability,
        currency: cardValidation.currency,
      },
      request.vendorId
    );

    if (!vendor.defaultPaymentMethodId) {
      await cardService.updateDefaultCard(request.vendorId, cardDetails.id);
    }

    return response.send({
      success: true,
      cardDetails,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
const getVendorCards = async (request, response) => {
  const cards = await vendorService.getVendorCards(request.vendorId);

  return response.send({
    success: true,
    cards: cards.map((card) => ({
      ...card,
      expirationDate: card.expirationDateEncrypted
        ? Encrypt.decrypt(card.expirationDate)
        : card.expirationDate,
    })),
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
const updateDefaultCard = async (request, response) => {
  const { cardId } = request.body;
  const isVendorCard = await vendorService.isVendorCard(
    request.vendorId,
    cardId
  );

  if (!isVendorCard) {
    return response
      .status(400)
      .send({ success: false, message: 'Invalid card id' });
  }

  await cardService.updateDefaultCard(request.vendorId, cardId);

  return response.send({ success: true });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
const deleteCard = async (request, response) => {
  const cardId = parseInt(request.params.cardId);
  const isVendorCard = await vendorService.isVendorCard(
    request.vendorId,
    cardId
  );

  if (!isVendorCard) {
    return response
      .status(400)
      .send({ success: false, message: 'Invalid card id' });
  }

  await cardService.deleteCard(request.vendorId, cardId);

  return response.send({ success: true });
};

module.exports = {
  createNewCard,
  getVendorCards,
  updateDefaultCard,
  deleteCard,
};
