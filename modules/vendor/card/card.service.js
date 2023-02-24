const {
  vendorCard: vendorCard,
  vendor: Vendor,
  vendorPaymentMethod: VendorPaymentMethod,
} = require('../../../prisma/prismaClient');
const Encrypt = require('../../../utils/Encrypt');
const Stripe = require('../../../utils/Stripe');
const logger = require('../../../utils/Logger');

const getVendorCardByNumber = async (number, vendorId) => {
  const vendorCards = await vendorCard.findMany({
    where: {
      vendorId,
    },
    select: {
      id: true,
      name: true,
      number: true,
      lastFour: true,
      expirationDate: true,
      network: true,
    },
  });

  const decryptedNumbers = vendorCards.map((card) =>
    Encrypt.decrypt(card.number)
  );

  if (decryptedNumbers.includes(number)) {
    const cardIndex = decryptedNumbers.indexOf(number);
    delete vendorCards[cardIndex].number;
    return vendorCards[cardIndex];
  }

  return false;
};

const createNewCard = async (data, vendorId) => {
  const { number, expirationDate, cvv, fullName } = data;
  const lastFour = number.slice(number.length - 4);
  const firstSix = number.slice(0, 6);

  logger.info(`Vendor ID before create stripe ${vendorId} `);
  const vendor = await Vendor.findUnique({ where: { id: vendorId } });
  // create stripe card token
  const stripeCard = await Stripe.createCard(vendor.stripeId, {
    number: number,
    cvc: cvv,
    exp_month: parseInt(expirationDate.split('-')[1]),
    exp_year: parseInt(expirationDate.split('-')[0]),
  });

  const stripeId = stripeCard.id;

  const paymentMethod = await VendorPaymentMethod.create({
    data: {
      vendor: {
        connect: {
          id: vendorId,
        },
      },
      type: 'card',
      vendorCard: {
        create: {
          fullName,
          stripeId,
          name: `${data.network} ${lastFour}`,
          fundsAvailability: data.fundsAvailability,
          network: data.network,
          type: data.type || 'debit',
          vendor: {
            connect: {
              id: vendorId,
            },
          },
          lastFour,
          firstSix,
          number: Encrypt.encrypt(number),
          expirationDate: expirationDate,
          expirationDateEncrypted: false,
          cvv,
        },
      },
    },
    select: {
      vendorCard: {
        select: {
          id: true,
          fullName: true,
          lastFour: true,
          network: true,
          expirationDate: true,
        },
      },
    },
  });

  return paymentMethod.vendorCard;
};

const updateDefaultCard = async (vendorId, cardId) => {
  const card = await vendorCard.findUnique({
    where: { id: cardId },
    include: { vendorPaymentMethod: true },
  });
  if (card.vendorPaymentMethod.length) {
    return await Vendor.update({
      where: { id: vendorId },
      data: {
        defaultPaymentMethod: {
          connect: { id: card.vendorPaymentMethod[0].id },
        },
      },
    });
  }
};

const deleteCard = async (vendorId, cardId) => {
  const card = await vendorCard.findFirst({
    where: {
      vendorId,
      id: cardId,
    },
    include: {
      vendor: true,
    },
  });

  if (!card) {
    throw new Error('Invalid card id');
  }
  if (card.stripeId && card.vendor.stripeId) {
    await Stripe.deleteCard(card.vendor.stripeId, card.stripeId);
  }

  return vendorCard.delete({ where: { id: cardId } });
};

module.exports = {
  getVendorCardByNumber,
  createNewCard,
  updateDefaultCard,
  deleteCard,
};
