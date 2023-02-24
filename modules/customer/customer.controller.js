const express = require('express');
const customerService = require('./customer.service');
const {
  addToDwolla,
  createNewFundingTokenForExistingCustomer,
  formatPhone,
} = require('./customer.utils');

const { REFUND_STEPS } = require('../../utils/Constants');
const { generateCustomerLoginToken } = require('./customer.utils');
const getRequestIp = require('../../utils/GetRequestIP');
const vendorService = require('../vendor/vendor.service');
const refundService = require('../vendor/refund/refund.service');
const Dwolla = require('../../utils/Dwolla');
const Plaid = require('../../utils/Plaid');
const VerificationFactory = require('../../utils/VerificationFactory');
const AptPay = require('../../utils/AptPay');
const Encrypt = require('../../utils/Encrypt');

/**
 * Gets a specific customer
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getCustomer = async (request, response) => {
  const customerEmail = request.query.email.toLowerCase();
  const customerData = await customerService.getCustomerEmailOrPhone(
    customerEmail
  );
  const emailToken = customerService.generateCustomerEmailToken(customerEmail);

  if (!customerData) {
    return response.status(200).send({
      message:
        'Your customer data was not found, you might be new or mistyped the email',
      success: false,
      emailToken,
    });
  }

  const customerDataSelection = request.query.select;
  if (request.refundId) {
    await refundService.moveRefundTimelineToStep(
      request.refundId,
      REFUND_STEPS.EMAIL_CHECK
    );
  }

  response.send({
    success: true,
    emailToken,
    data: customerDataSelection
      ? customerData[customerDataSelection]
      : customerData,
  });
};

/**
 * Creates a new customer
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.createNewCustomer = async (request, response, next) => {
  if (request.customer) {
    return response.status(400).send({
      success: false,
      message: `This email/phone has been already used to create an account and is linked to ${customerService.maskCustomerEmail(
        request.customer.email
      )}!`,
    });
  }

  const {
    firstName,
    lastName,
    ssn,
    dob,
    address1,
    address2,
    city,
    state,
    zip,
  } = request.body;

  const [mm, dd, yyyy] = dob.split('/');
  const aptpayDOB = `${yyyy}-${mm}-${dd}`;

  if (parseInt(yyyy) > new Date().getFullYear() - 18) {
    return response.status(400).send({
      success: false,
      message:
        'We can not allow you to create an account while you are under 18 years',
    });
  }

  let phone, email;

  if (request.body.phone) {
    request.body.phone = formatPhone(request.body.phone);
  }

  if (request.customerEmail) {
    if (request.body.email !== request.customerEmail) {
      return response.status(400).send({
        message: 'You can not change the email that you have just verified!',
        success: false,
      });
    }
    email = request.customerEmail.toLowerCase();
    phone = request.body.phone;
  } else {
    if (
      request.body.phone &&
      request.customerPhone &&
      request.customerPhone !== request.body.phone
    ) {
      return response.status(400).send({
        message: 'You can not change the phone that you have just verified!',
        success: false,
      });
    }
    email = request.body.email.toLowerCase();
    phone = request.customerPhone;
  }
  const isCustomerExists = await Promise.all([
    customerService.getCustomerEmailOrPhone(email),
    customerService.getCustomerEmailOrPhone(phone),
  ]);

  if (isCustomerExists[0]) {
    return response.status(400).send({
      message: `This email/phone has been already used to create an account and is linked to ${customerService.maskCustomerEmail(
        isCustomerExists[0].email
      )}!`,
      success: false,
    });
  }
  if (isCustomerExists[1]) {
    return response.status(400).send({
      message: `This email/phone has been already used to create an account and is linked to ${customerService.maskCustomerEmail(
        isCustomerExists[1].email
      )}!`,
      error_code: 4010,
      success: false,
    });
  }
  try {
    const createdCustomerId = await customerService.createNewCustomer({
      phone,
      firstName,
      lastName,
      email,
      ssn,
      dob,
      refundId: request.refundId,
      address1,
      address2,
      city,
      state,
      zip,
    });
    if (createdCustomerId !== -1) {
      // const customerIpAddress = getRequestIp(request);
      // const customerFundingToken = await addToDwolla(
      //   { firstName, lastName, email },
      //   customerIpAddress
      // );
      await refundService.moveRefundTimelineToStep(
        request.refundId,
        REFUND_STEPS.CREATE_ACCOUNT
      );
      const aptpayCustomer = await AptPay.createPayee({
        first_name: firstName,
        last_name: lastName,
        phone: formatPhone(phone),
        email,
        city,
        country: 'US',
        dateOfBirth: aptpayDOB,
        nationalIdentityNumber: ssn,
        street: address1,
        street_line_2: address2,
        zip,
        clientId: createdCustomerId,
      });

      await customerService.updateAptpayData(createdCustomerId, {
        aptpayId: aptpayCustomer.id.toString(),
        aptpayStatus: aptpayCustomer.status,
        aptpayErrorCode: '',
      });

      const customerData = await customerService.getCustomerEmailOrPhone(
        email || phone
      );
      return response.send({
        success: true,
        customerId: createdCustomerId,
        customer: customerData,
        // fundingToken: customerFundingToken,
      });
    }

    response.status(500).send({
      message: 'Something went wrong while trying to create this customer',
      success: false,
    });
  } catch (err) {
    next(err);
  }
};

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.createNewCard = async (request, response, next) => {
  // Reformat expiration date to match aptpay
  const [MM, YY] = request.body.expirationDate.split('/').map((i) => i.trim());
  const currentYear = new Date().getFullYear().toString();

  request.body.expirationDate = `${currentYear.substr(
    0,
    currentYear.length - 2
  )}${YY}-${MM}`;

  const { number, expirationDate } = request.body;

  try {
    // if card last 4 doesnt match

    /**
     * 1- correct card , supports instant payment : success with card payment
     * 2- correct card, doesnt support instant payment: mark in refund that card is validated, return { cardLastFourVerified: true, success: false }
     * 3- incorrect card => error
     */

    const refund = await refundService.getRefund(request.refundId);
    const lastFour = number.includes('_')
      ? number.split('_').pop()
      : number.substr(-4);

    if (
      refund.cardLastFour &&
      !refund.cardLastFourVerified &&
      lastFour !== refund.cardLastFour
    ) {
      return response.status(400).send({
        success: false,
        message: 'CARD_MATCH_ERROR',
      });
    }

    const cardValidation = await AptPay.validateCard({
      amount: 0.5,
      currency: 'USD',
      disbursementNumber: number,
      expirationDate,
    });

    if (
      cardValidation.type === 'NOT VALID' ||
      cardValidation.reason_code === 'INVALID_INPUT_FORMAT'
    ) {
      console.dir({ cardValidation }, { depth: null });
      return response.status(400).send({
        success: false,
        message: 'CARD_ERROR',
      });
    }

    if (
      refund.cardLastFour &&
      !refund.cardLastFourVerified &&
      lastFour === refund.cardLastFour
    ) {
      await refundService.markRefundLastFourVerified(request.refundId);
      refund.cardLastFourVerified = true;
    }

    if (!cardValidation.receiving) {
      return response.status(400).send({
        success: false,
        message: 'NON_RECEIVING_CARD',
        cardLastFourVerified: refund.cardLastFourVerified,
      });
    }

    if (cardValidation.type !== 'DEBIT') {
      return response.status(400).send({
        success: false,
        cardLastFourVerified: refund.cardLastFourVerified,
        message: 'DEBIT_CARD_REQUIRED',
      });
    }
    if (cardValidation.funds_availability !== 'IMMEDIATE') {
      return response.status(400).send({
        success: false,
        cardLastFourVerified: refund.cardLastFourVerified,
        message: 'INSTANT_REFUND_UNSUPPORTED',
      });
    }

    const lockedToRefund = lastFour === refund.cardLastFour;
    const cardExists = await customerService.getCustomerCardByNumber(
      request.body.number,
      request.customer.id
    );

    if (cardExists) {
      if (lockedToRefund) {
        await refundService.lockCardToRefund(cardExists.id, refund.id);
      }
      return response.send({
        success: true,
        cardDetails: cardExists,
        cardLastFourVerified: refund.cardLastFourVerified,
        lockedToRefund: lockedToRefund,
      });
    }

    const cardDetails = await customerService.createNewCard(
      {
        ...request.body,
        network: cardValidation.network,
        fundsAvailability: cardValidation.funds_availability,
        currency: cardValidation.currency,
      },
      request.customer.id
    );

    if (lockedToRefund) {
      await refundService.lockCardToRefund(cardDetails.id, refund.id);
    }

    await refundService.moveRefundTimelineToStep(
      request.refundId,
      REFUND_STEPS.ADD_CARD
    );

    return response.send({
      success: true,
      cardDetails,
      cardLastFourVerified: refund.cardLastFourVerified,
      lockedToRefund: lockedToRefund,
    });
  } catch (err) {
    next(err);
  }
};

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getCustomerCards = async (request, response) => {
  try {
    const cards = await customerService.getCustomerCards(request.customer.id);

    return response.send({ success: true, cards });
  } catch (err) {
    console.log(err);
    return response.status(400).send({ success: false });
  }
};

/**
 * Updates customer data
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.updateCustomerData = async (request, response, next) => {
  if (request.customer.id != request.params.customerId) {
    return response.status(401).send({
      success: false,
      message: 'You can not change other users data',
    });
  }

  const {
    phone,
    firstName,
    lastName,
    email,
    ssn,
    dob,
    address1,
    address2,
    city,
    state,
    zip,
  } = request.body;

  if (dob) {
    return response
      .status(400)
      .send({ success: false, message: 'Cannot update you date of birth' });
  }

  try {
    const customerUpdated = await customerService.updateCustomerData({
      id: request.customer.id,
      firstName,
      lastName,
      email: email ? email.toLowerCase() : null,
      phone: formatPhone(phone),
      ssn,
      dob,
      address1,
      address2,
      city,
      state,
      zip,
      refundId: request.refundId,
    });
    if (customerUpdated === -1) {
      return response.status(400).send({
        success: false,
        error_code: 4010,
        message:
          'The email/phone number that you are providing is currently in use by another customer.',
      });
    }

    await AptPay.updatePayee(customerUpdated.aptpayId, {
      first_name: customerUpdated.firstName,
      last_name: customerUpdated.lastName,
      phone: formatPhone(customerUpdated.phone),
      email: customerUpdated.email,
      city: customerUpdated.city,
      country: 'US',
      // dateOfBirth: customerUpdated.dob, // cannot update dob on aptpay
      nationalIdentityNumber: Encrypt.decrypt(customerUpdated.ssn),
      street: customerUpdated.address1,
      street_line_2: customerUpdated.address2,
      zip: customerUpdated.zip,
    });
    // const fundingToken = await createNewFundingTokenForExistingCustomer(
    //   request.customer.email
    // );
    const { expirationDate } = await refundService.getRefund(request.refundId);
    const customerIp = getRequestIp(request);
    const parsedReceiver = email ? email.toLowerCase() : phone;

    const token = await generateCustomerLoginToken(
      parsedReceiver,
      customerIp,
      request.refundId,
      expirationDate - Date.now() > 0
        ? Number.parseInt((expirationDate - Date.now()) / 1000)
        : 1
    );

    delete customerUpdated.ssn;

    response.status(201).send({
      success: true,
      message: 'The user data has been changed successfully!',
      token,
      customer: customerUpdated,
    });
  } catch (error) {
    if (error.response && error.response.data && error.response.data.errors) {
      return response
        .status(400)
        .send({ message: error.response.data.errors[0] });
    }
    next(error);
  }
};

/**
 * Sends a verification code to this email
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.sendVerificationCode = async (request, response) => {
  let parsedReceiver = request.body.receiver.toString().toLowerCase();
  if (!parsedReceiver.includes('@')) {
    parsedReceiver = formatPhone(parsedReceiver);
    const emailToken = request.body.emailToken;
    if (!emailToken) {
      return response.status(400).send({
        success: false,
        message: 'Please provide a valid value for emailToken',
      });
    }

    try {
      const parsedEmail = customerService.parseCustomerEmailToken(
        request.body.emailToken
      );
      const existingCustomer = await customerService.getCustomerEmailOrPhone(
        parsedReceiver
      );
      if (existingCustomer && existingCustomer.email !== parsedEmail) {
        return response.status(400).send({
          success: false,
          error_code: 4010,
          message: `The phone number ${parsedReceiver} you entered is already linked to an account ${customerService.maskCustomerEmail(
            existingCustomer.email
          )}`,
        });
      }
    } catch (err) {
      return response
        .status(400)
        .send({ success: false, message: 'Invalid emailToken' });
    }
  }

  const verificationMethod = VerificationFactory(parsedReceiver, 'customer');

  const isCodeSent = await verificationMethod.sendCode();
  if (isCodeSent) {
    if (request.refundId) {
      await refundService.moveRefundTimelineToStep(
        request.refundId,
        REFUND_STEPS.VERIFY
      );
    }
    return response.status(201).send({ success: true });
  }
  response.send(500);
};

/**
 * Verifies user code, if code is correct, sends back JWT token
 * If this user exists, sends back his data & his funding resources
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.verifyCodeAndLogin = async (request, response, next) => {
  const { receiver, code } = request.body;
  let parsedReceiver = receiver.toString().toLowerCase();
  if (!parsedReceiver.includes('@')) {
    parsedReceiver = formatPhone(parsedReceiver);
  }

  try {
    const verificationMethod = VerificationFactory(parsedReceiver);

    const validCode = await verificationMethod.verifyCode(code);
    console.log({ validCode });
    if (validCode) {
      const customerIp = getRequestIp(request);
      const customerData = await customerService.getCustomerEmailOrPhone(
        parsedReceiver
      );

      let token = '';
      if (request.refundId) {
        const { expirationDate, vendorId } = await refundService.getRefund(
          request.refundId
        );

        const isCustomerDisabled = await vendorService.isCustomerDisabled(
          vendorId,
          parsedReceiver
        );
        if (isCustomerDisabled) {
          return response.status(400).send({
            success: false,
            message:
              'Your vendor has disabled you from getting your refund, for further information, please contact him.',
          });
        }

        await refundService.moveRefundTimelineToStep(
          request.refundId,
          REFUND_STEPS.VERIFY_SUBMIT
        );
        await refundService.markReceiverVerified(request.refundId);
        if (customerData && customerData.id) {
          await refundService.linkRefundToCustomer(
            request.refundId,
            customerData.id
          );
        }

        token = await generateCustomerLoginToken(
          parsedReceiver,
          customerIp,
          request.refundId,
          expirationDate - Date.now() > 0
            ? Number.parseInt((expirationDate - Date.now()) / 1000)
            : 1
        );
      } else {
        token = await generateCustomerLoginToken(
          parsedReceiver,
          customerIp,
          '',
          60 * 60 * 24
        );
      }

      return response.status(202).send({
        success: true,
        token,
        customerData,
      });
    }
    return response
      .status(400)
      .send({ message: 'Failed to verify this customer', success: false });
  } catch (error) {
    next(error);
  }
};

/**
 * Checks if user has already added funding sources before, if true
 * it tries to match his refund with anyone of those sources, if matched, it
 * returns data of matched card, else, it returns nothing
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.checkFundingMatchesRefund = async (request, response, next) => {
  const { method } = request.query;

  const lastFour = await refundService.getRefundLastFour(request.refundId);
  const lastThree = lastFour.slice(-3);
  const [debitCards, bankAccounts] = await Promise.all([
    Dwolla.getDwollaCustomerCards(request.customer.email),
    Dwolla.getDwollaCustomerBankAccounts(request.customer.email),
  ]);
  const plaidToken = await Plaid.createPlaidToken(request.customer.id);
  if (bankAccounts.length === 0 && debitCards.length === 0) {
    return response.status(400).send({
      success: false,
      message:
        'Can not find any funding source (neither bank account nor debit card) attached to this customer.',
      plaidToken,
      lastThree,
    });
  }
  try {
    if (method === 'debit') {
      if (debitCards.length === 0) {
        return response.status(400).send({
          success: false,
          plaidToken,
          message:
            'Can not find any existing debit card that matches this refund!!', //do not change the frontend is relying on this
          bankAccounts,
          lastThree,
        });
      }
      const verifiedCards = await Promise.all(
        debitCards.map((debitCard) =>
          refundService.isCardMatchRefund(debitCard.lastFour, request.refundId)
        )
      );
      const verifiedCardIndex = verifiedCards.findIndex((verifiedStatus) =>
        Boolean(verifiedStatus)
      );
      if (verifiedCardIndex === -1) {
        return response.status(400).send({
          success: false,
          plaidToken,
          message:
            'Can not find any existing debit card that matches this refund!!',
          bankAccounts,
          lastThree,
        });
      }

      response.send({
        success: true,
        plaidToken,
        bankAccounts,
        debitCards: [debitCards[verifiedCardIndex]],
        lastThree,
      });
    } else {
      response.send({
        success: true,
        bankAccounts,
        plaidToken,
        lastThree,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.createFundingToken = async (request, response) => {
  const fundingToken = await createNewFundingTokenForExistingCustomer(
    request.customer.email
  );

  response.send({ success: true, fundingToken });
};
module.exports.getCustomerRefunds = async (request, response) => {
  const { pageLength, cursor } = request.query;
  const refundsData = await refundService.getCustomerRefunds(
    Number.parseInt(request.params.customerId, 10),
    cursor ? Number.parseInt(cursor, 10) : null,
    pageLength ? Number.parseInt(pageLength, 10) : null
  );

  response.send({ success: true, ...refundsData });
};
