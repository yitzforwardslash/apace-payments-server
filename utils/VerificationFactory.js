const sendGrid = require('./SendGrid');
const twilio = require('./Twilio');
const { verifyCode: VerifyCode } = require('../prisma/prismaClient');
const generateCode = require('./generateCode');

/**
 * Saves a code to a given method
 * @param {String} method can be email or phone
 * @param {Number} expireAfterInMinutes
 * @returns {Promise<Number>} the random code that was generated for this email
 */
const createCode = async (method, expireAfterInMinutes = 15) => {
  const code = await generateCode(4);
  if (expireAfterInMinutes <= 0) {
    throw new Error(`expireAfterInMinutes can not be ${expireAfterInMinutes}`);
  }
  const expireAt = new Date();
  expireAt.setMinutes(expireAt.getMinutes() + expireAfterInMinutes);
  return (await VerifyCode.create({ data: { method, code, expireAt } })).code;
};

module.exports = function (receiver, receiverType = 'vendor') {
  const type = receiver.indexOf('@') === -1 ? 'phone' : 'email';
  if (type === 'phone') {
    return new PhoneVerification(receiver);
  } else {
    return new EmailVerification(receiver, receiverType);
  }
};

const PhoneVerification = function (phone) {
  this.sendCode = async () => {
    return await twilio.verify.v2
      .services(process.env.TWILIO_VERIFICATION_SERVICE)
      .verifications.create({ to: phone, channel: 'sms' });
  };

  this.verifyCode = async (code) => {
    const { valid } = await twilio.verify.v2
      .services(process.env.TWILIO_VERIFICATION_SERVICE)
      .verificationChecks.create({ to: phone, code: code.toString() });

    return valid;
  };
};

const EmailVerification = function (email, type = 'vendor') {
  this.sendCode = async () => {
    const code = await createCode(email, 15);
    return sendGrid
      .send({
        dynamicTemplateData: {
          code,
        },
        from: {
          email:
            type === 'customer'
              ? process.env.SENDING_EMAIL_CUSTOMERS
              : process.env.SENDING_EMAIL_VENDORS,
          name: 'Apace Payments',
        },
        templateId: process.env.SENDGRID_CODE_TEMPLATE,
        to: email,
      })
      .then((sendGridProcess) => sendGridProcess[0].statusCode === 202)
      .then(() => ({ code }));
  };

  this.verifyCode = async (code) => {
    const usedCodes = await VerifyCode.updateMany({
      where: {
        code: Number.parseInt(code, 10),
        method: email,
        used: false,
        expireAt: { gt: new Date() },
      },
      data: { used: true },
    });
    return usedCodes.count === 1;
  };
};
