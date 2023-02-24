const sendGrid = require('../../utils/SendGrid');
const twilio = require('../../utils/Twilio');
const { verifyCode: verifyCodeEmail } = require('./customer.service');
const Dwolla = require('../../utils/Dwolla');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 10;

/**
 * Sends verification code to a specific email
 * @param {String} email
 * @param {Number} code
 * @returns {Promise<Boolean>}
 */
const sendVerificationEmail = async (email, code) => {
  const sendGridProcess = await sendGrid.send({
    dynamicTemplateData: { code },
    from: {
      email: process.env.SENDING_EMAIL_CUSTOMERS,
      name: 'Apace Payments',
    },
    templateId: process.env.SENDGRID_CODE_TEMPLATE,
    to: email,
  });
  return sendGridProcess[0].statusCode === 202;
};

/**
 * Sends verification code to a specific phone
 * @param {String} phone
 * @param {Number} code
 * @returns {Promise<Boolean>}
 */
const sendVerificationPhone = (phone) =>
  twilio.verify
    .services(process.env.TWILIO_VERIFICATION_SERVICE)
    .verifications.create({ to: phone, channel: 'sms' });

/**
 * Maps the required function to each type of receiver
 */
const sendVerificationCodeMethods = {
  phone: sendVerificationPhone,
  email: sendVerificationEmail,
};

/**
 * Verifies that this phone is owned by this user
 * @param {String} phone
 * @param {Number} code
 * @returns {Promise<Boolean>}
 */
const verifyCodePhone = (phone, code) =>
  twilio.verify
    .services(process.env.TWILIO_VERIFICATION_SERVICE)
    .verificationChecks.create({ code, to: phone });

/**
 * Maps the required function to each type of receiver
 */
const verifyCodeMethods = {
  phone: verifyCodePhone,
  email: verifyCodeEmail,
};

/**
 * Determine the used verification method depending on the type of the receiver
 * @param {String} receiver
 * @returns {String}
 */
const getVerificationMethod = (receiver) =>
  receiver.indexOf('@') === -1 ? 'phone' : 'email';

/**
 * Sends a verification code to the receiver
 * @param {String} receiver
 * @param {Number} code
 * @returns {Promise<Boolean>} whether successfully sent or not
 */
module.exports.sendVerificationCode = (receiver, code) => {
  return sendVerificationCodeMethods[getVerificationMethod(receiver)](
    receiver,
    code
  );
};

/**
 * Verifies a code that was sent to this receiver
 * @param {String} receiver
 * @param {Number} code
 * @returns {Promise<Boolean>} whether verified or not
 */
module.exports.verifySentCode = (receiver, code) => {
  return verifyCodeMethods[getVerificationMethod(receiver)](receiver, code);
};

/**
 * Adds a customer to dwolla
 * @param {Object} customerData
 * @param {String} customerData.firstName
 * @param {String} customerData.lastName
 * @param {String} customerData.email
 * @param {String} customerIpAddress
 * @returns {Promise<String>} customer funding source token
 *
 */

module.exports.addToDwolla = async ({ firstName, lastName, email }) => {
  const dwollaCustomerUrl = await Dwolla.createDwollaReceiveOnlyCustomer(
    firstName,
    lastName,
    email
  );
  if (!dwollaCustomerUrl) {
    return;
  }
  return Dwolla.createCardFundingSourceToken({
    customerUrl: dwollaCustomerUrl,
  });
};

/**
 * @param {String} customerIdentifier can be email or phone
 * @param {String} customerIP
 * @param {String} refundId
 * @param {Number} remainingTimeInSeconds
 * @returns {String}
 */
module.exports.generateCustomerLoginToken = async (
  customerIdentifier,
  customerIP,
  refundId,
  remainingTimeInSeconds = 15 * 60
) => {
  const isEmail = customerIdentifier.indexOf('@') !== -1;
  const hashedIP = await bcrypt.hash(customerIP, saltRounds);
  return jwt.sign(
    {
      id: customerIdentifier,
      key: hashedIP,
      refundId,
      [isEmail ? 'email' : 'phone']: customerIdentifier,
    },
    process.env.JWT_SECRET,
    { expiresIn: remainingTimeInSeconds }
  );
};

/**
 * @param {String} email
 * @returns {Promise<String>}
 */
module.exports.createNewFundingTokenForExistingCustomer = async (email) => {
  return Dwolla.createCardFundingSourceToken({ customerEmail: email });
};

/**
 *
 * @param {String} phone
 * @returns {String}
 */

module.exports.formatPhone = require('./formatPhone');
