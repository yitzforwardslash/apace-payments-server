const {
  verifyCode: VerifyCode,
  customer: Customer,
  customerCard: CustomerCard,
} = require('../../prisma/prismaClient');
const AptPay = require('../../utils/AptPay');
const jwt = require('jsonwebtoken');
const Encrypt = require('../../utils/Encrypt');
const generateCode = require('../../utils/generateCode');
const logger = require('../../utils/Logger');
const formatPhone = require('./formatPhone');

function getAstrics(length) {
  return Array.from(new Array(length))
    .map((i) => '*')
    .join('');
}

/**
 *
 * @param {String} email
 */
module.exports.maskCustomerEmail = (email) => {
  const [prefix, domain] = email.split('@');
  let masked = '';
  if (prefix.length > 10) {
    masked = `${prefix.substring(0, 3)}${getAstrics(
      prefix.length - 6
    )}${prefix.substring(3 + prefix.length - 6, prefix.length)}`;
  } else if (prefix.length > 4) {
    masked = `${prefix.substring(0, 2)}${getAstrics(
      prefix.length - 2
    )}${prefix.substring(1 + prefix.length - 3, prefix.length)}`;
  } else if (prefix.length > 2) {
    masked = `${prefix.substring(0, 1)}${getAstrics(
      prefix.length - 2
    )}${prefix.substring(1 + prefix.length - 2, prefix.length)}`;
  } else {
    masked = `${prefix.substring(0, 1)}${
      prefix.length > 1 ? getAstrics(prefix.length - 1) : ''
    }`;
  }
  masked = `${masked}@${domain}`;

  return masked;
};

module.exports.generateCustomerEmailToken = (email) => {
  return jwt.sign({ email, type: 'email-token' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

module.exports.parseCustomerEmailToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded || decoded.type !== 'email-token') {
    throw new Error('Invalid token');
  }
  return decoded.email;
};
/**
 * @typedef {Object} Customer
 * @property {Number} id
 * @property {String} firstName
 * @property {String} lastName
 * @property {String} email
 * @property {String} phone
 * @property {Array} refunds
 * @property {Date} lastUpdated
 * @property {Date} createdAt
 */

/**
 * Gets a specific customer by email or phone
 * @param {String} identifier
 * @returns {Promise<Customer>}
 */
module.exports.getCustomerEmailOrPhone = async (identifier) => {
  const query = {};
  if (identifier.indexOf('@') === -1) {
    query.phone = formatPhone(identifier);
  } else {
    query.email = identifier;
  }
  const customer = await Customer.findUnique({ where: query });
  if (customer) {
    delete customer.ssn;
  }
  return customer;
};

/**
 * Creates a new customer and connects it with a given refund request
 * @param {Object} customerData
 * @param {String} customerData.firstName
 * @param {String} customerData.lastName
 * @param {String} customerData.email
 * @param {String} customerData.phone
 * @param {String} customerData.dob
 * @param {String} customerData.refundId
 * @param {String} customerData.address1
 * @param {String} customerData.address2
 * @param {String} customerData.city
 * @param {String} customerData.state
 * @param {String} customerData.zip
 * @returns {Promise<Number>} customer id
 */
module.exports.createNewCustomer = ({
  firstName,
  lastName,
  phone,
  email,
  ssn,
  dob,
  refundId,
  address1,
  address2,
  city,
  state,
  zip,
}) =>
  Customer.create({
    data: {
      email,
      firstName,
      lastName,
      phone,
      dob,
      address1,
      address2,
      city,
      state,
      zip,
      ssn: Encrypt.encrypt(ssn),
      ssnLastFour: ssn.substr(-4),
      refunds: { connect: { id: refundId } },
    },
  })
    .then((newCustomer) => newCustomer.id)
    .catch((error) => {
      logger.error(error);
      return -1;
    });

module.exports.updateAptpayData = async (
  id,
  { aptpayId, aptpayStatus, aptpayErrorCode }
) => {
  const update = {
    aptpayId,
    aptpayStatus,
    aptpayErrorCode,
  };
  return Customer.update({
    where: { id },
    data: { ...update, lastUpdated: new Date() },
  });
};

/**
 *
 * @param {Object} customerData
 * @param {String} customerData.firstName
 * @param {String} customerData.lastName
 * @param {String} customerData.email
 * @param {String} customerData.phone
 * @param {Number} customerData.id
 * @param {String} customerData.ssn
 * @param {String} customerData.dob
 * @param {String} customerData.refundId request.refundId,
 * @param {String} customerData.address1
 * @param {String} customerData.address2
 * @param {String} customerData.city
 * @param {String} customerData.state
 * @param {String} customerData.zip
 */
module.exports.updateCustomerData = ({
  firstName,
  lastName,
  email,
  phone,
  id,
  ssn,
  dob,
  refundId,
  address1,
  address2,
  city,
  state,
  zip,
}) => {
  const updatedData = {};
  if (firstName) {
    updatedData.firstName = firstName;
  }
  if (lastName) {
    updatedData.lastName = lastName;
  }
  if (email) {
    updatedData.email = email;
  }
  if (phone) {
    updatedData.phone = phone;
  }
  if (ssn) {
    updatedData.ssn = Encrypt.encrypt(ssn);
    updatedData.ssnLastFour = ssn.substr(-4);
  }
  if (dob) {
    updatedData.dob = dob;
  }
  if (refundId) {
    updatedData.refunds = { connect: { id: refundId } };
  }
  if (address1) {
    updatedData.address1 = address1;
  }
  if (address2) {
    updatedData.address2 = address2;
  }
  if (city) {
    updatedData.city = city;
  }
  if (state) {
    updatedData.state = state;
  }
  if (zip) {
    updatedData.zip = zip;
  }

  return Customer.update({
    where: { id },
    data: { ...updatedData, lastUpdated: new Date() },
  }).catch((error) => -1);
};
function getCardNetwork(number) {
  let cardVendor = '';

  if (number.match(/^4[0-9]{6,}$/)) {
    cardVendor = 'Visa';
  } else if (
    number.match(
      /^5[1-5][0-9]{5,}|222[1-9][0-9]{3,}|22[3-9][0-9]{4,}|2[3-6][0-9]{5,}|27[01][0-9]{4,}|2720[0-9]{3,}$/
    )
  ) {
    cardVendor = 'MasterCard';
  } else if (number.match(/^3[47][0-9]{5,}$/)) {
    cardVendor = 'American Express';
  } else if (number.match(/^3(?:0[0-5]|[68][0-9])[0-9]{4,}$/)) {
    cardVendor = 'Diners Club';
  } else if (number.match(/^6(?:011|5[0-9]{2})[0-9]{3,}$/)) {
    cardVendor = 'Discover';
  } else if (number.match(/^(?:2131|1800|35[0-9]{3})[0-9]{3,}$/)) {
    cardVendor = 'JCB';
  }

  return cardVendor;
}
function getCardName(network, number) {
  const cardVendor = `${network} ${number.substr(-4)}`;

  return cardVendor;
}
/**
 * @typedef {Object} CardData
 * @property {String} name
 * @property {String} fullName
 * @property {String} number
 * @property {String} network
 * @property {String} fundsAvailability
 * @property {String} currency
 * @property {String} expirationDate
 * @property {String} cvv
 */

/**
 *
 * @param {CardData} data
 * @param {Number} customerId
 * @returns
 */

module.exports.createNewCard = async (data, customerId) => {
  const { number, expirationDate, cvv, fullName } = data;
  const lastFour = number.substr(-4);
  const firstSix = number.substr(0, 6);
  const card = await CustomerCard.create({
    data: {
      fullName,
      name: `${data.network} ${lastFour}`,
      fundsAvailability: data.fundsAvailability,
      network: data.network,
      type: 'debit',
      customer: {
        connect: { id: customerId },
      },
      lastFour,
      firstSix,
      number: Encrypt.encrypt(number),
      expirationDate: Encrypt.encrypt(expirationDate),
      cvv,
    },
    select: {
      id: true,
      name: true,
      lastFour: true,
      network: true,
    },
  });
  return card;
};

module.exports.getCustomerCardByNumber = async (number, customerId) => {
  const customerCards = await CustomerCard.findMany({
    where: {
      customerId,
    },
    select: {
      id: true,
      name: true,
      number: true,
      lastFour: true,
      network: true,
    },
  });

  const decryptedNumbers = customerCards.map((card) =>
    Encrypt.decrypt(card.number)
  );

  if (decryptedNumbers.includes(number)) {
    const cardIndex = decryptedNumbers.indexOf(number);
    delete customerCards[cardIndex].number;
    return customerCards[cardIndex];
  }

  return false;
};

/**
 *
 * @param {CardData} data
 * @returns
 */

module.exports.getCustomerCards = async (customerId) => {
  const cards = await CustomerCard.findMany({
    where: {
      customerId,
    },
    select: {
      id: true,
      name: true,
      lastFour: true,
      network: true,
    },
  });
  return cards;
};

module.exports.getCardOwner = (id) =>
  CustomerCard.findUnique({ where: { id }, select: { customer: true } }).then(
    (card) => card.customer
  );

module.exports.getCard = (id) => CustomerCard.findUnique({ where: { id } });

/**
 * Verifies a code that was sent to a method
 * @param {String} method can be email or phone
 * @param {Number} code
 * @returns {Promise<Boolean>}
 */
module.exports.verifyCode = async (method, code) => {
  const usedCodes = await VerifyCode.updateMany({
    where: { code, method, used: false, expireAt: { gt: new Date() } },
    data: { used: true },
  });
  return usedCodes.count === 1;
};
