const express = require('express');
const jwt = require('jsonwebtoken');
const vendorService = require('./vendor.service');
const {
  generateVendorJWT,
  generateSignupJWT,
  verifyJWT,
} = require('./vendor.utils');
const Limiter = require('../../utils/Limiter');
const getRequestIp = require('../../utils/GetRequestIP');
const { NotFoundError } = require('../../utils/CustomError');
const Dwolla = require('../../utils/Dwolla');
const updateVendorStatusPublisher = require('../../message-broker/publishers/updateVendorStatus');
const vendorFormulator = require('./vendor.formulator');
const Plaid = require('../../utils/Plaid');
const logger = require('../../utils/Logger');
const VerificationFactory = require('../../utils/VerificationFactory');
const {
  INDUSTRY_OPTIONS,
  COUNTRY_CODE_OPTIONS,
  AVERAGE_MONTHLY_OPTIONS,
  PLATFORM_OPTIONS,
} = require('../../utils/Constants');
const AptPay = require('../../utils/AptPay');
const { getAgreementURL } = require('./agreement/agreement.service');

module.exports.signupFailureLimiter = new Limiter(4, 60 * 5, 60 * 5);
module.exports.loginFailureLimiter = new Limiter(4, 60 * 5, 60 * 5);
module.exports.twoFactorFailureLimiter = new Limiter(4, 60 * 5, 60 * 5);

/**
 * Tries to add a new vendor if his data in unique, else sends error message
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.addNewVendor = async (request, response, next) => {
  const vendorData = {
    email: request.body.email,
    ownerFirstName: request.body.ownerFirstName,
    ownerLastName: request.body.ownerLastName,
    commercialName: request.body.commercialName,
    phone: request.body.phone,
    refundListStatuses: ['pending', 'failed', 'processed'],
  };
  try {
    const newVendor = await vendorService.addNewVendor(vendorData);
    response.send(newVendor);
    await Dwolla.createDwollaReceiveOnlyCustomer(
      vendorData.ownerFirstName,
      vendorData.ownerLastName,
      vendorData.email
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.signupOptions = (request, response) => {
  return response.status(200).send({
    industry: INDUSTRY_OPTIONS,
    countryCodes: COUNTRY_CODE_OPTIONS,
    averageMonthly: AVERAGE_MONTHLY_OPTIONS,
    platform: PLATFORM_OPTIONS,
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.signup = async (request, response) => {
  const vendor = await vendorService.getVendor({
    identifier: request.body.receiver.toLowerCase(),
  });
  if (vendor) {
    return response.status(400).send({
      success: false,
      message: 'This email/phone is already used',
    });
  }

  const token = generateSignupJWT({
    ...(request.body.receiver.toLowerCase().includes('@')
      ? {
          email: request.body.receiver.toLowerCase(),
        }
      : { phone: request.body.receiver }),
    password: request.body.password,
  });

  response.status(201).send({ success: true, signup_token: token });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.setupVendorOnboard = async (request, response, next) => {
  const {
    signup_token: token,
    firstname,
    lastname,
    commercialName,
    email,
    website,
    country,
    ecommerce_platform,
    consent,
    avg_monthly_refunds,
    industry,
    allow_notify,
    allow_twostepverify,
  } = request.body;
  let decoded = null;
  try {
    decoded = verifyJWT(token);
  } catch (ex) {
    return response
      .status(400)
      .send({ success: false, message: 'invalid token' });
  }
  try {
    const vendor = await vendorService.createVendor({
      ownerFirstName: firstname,
      ownerLastName: lastname,
      commercialName: commercialName || '',
      email: decoded.email || email,
      password: decoded.password,
      phone: decoded.phone,
      avg_monthly_refunds: avg_monthly_refunds,
      website,
      country,
      ecommerce_platform,
      consent,
      industry,
      allow_notify,
      allow_twostepverify,
    });
    if (!vendor) {
      throw new Error('vendor not created!');
    }

    return response.status(201).send({ success: true, vendor });
  } catch (ex) {
    return next(ex);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.updateOnboardData = async (request, response, next) => {
  const {
    firstname,
    lastname,
    commercialName,
    website,
    country,
    ecommerce_platform,
    avg_monthly_refunds,
    industry,
    entity,
    ein,
    street_1,
    street_2,
    city,
    state,
    zip,
    owner_firstname,
    owner_lastname,
    owner_dob,
    owner_ssn,
    owner_phone,
    annual_revenue,
    daily_returns,
    avg_item_price,
    dbaName,
    dateOfIncorporation,
  } = request.body;

  try {
    const fName = owner_firstname || firstname;
    const lName = owner_lastname || lastname;

    const vendor = await vendorService.updateVendorOnboard(request.vendorId, {
      ownerFirstName: fName,
      ownerLastName: lName,
      commercialName: commercialName,
      website,
      country,
      ecommerce_platform,
      avg_monthly_refunds: avg_monthly_refunds,
      industry,
      entity,
      ein,
      street_1,
      street_2,
      city,
      state,
      zip,
      owner_firstname: fName,
      owner_lastname: lName,
      owner_dob,
      owner_ssn,
      owner_phone,
      annualRevenue: annual_revenue,
      dailyReturns: daily_returns,
      avgItemPrice: avg_item_price,
      dbaName,
      dateOfIncorporation,
    });

    if (!vendor) {
      throw new Error('vendor not updated!');
    }

    return response.status(200).send({ success: true });
  } catch (ex) {
    if (ex.message) {
      return response.status(400).send({ success: false, message: ex.message });
    }
    return next(ex);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.submitForReview = async (request, response) => {
  const { agreementDate } = request.body;
  const vendor = await vendorService.getVendor({ id: request.vendorId });
  if (vendor.status === 'SUBMITTED') {
    return response.status(400).send({
      success: false,
      message: 'your profile is currently under review',
    });
  }
  if (vendor.status !== 'CREATED') {
    return response.status(400).send({
      success: false,
      message: 'Your profile cannot be submitted for review at current stagee',
    });
  }

  await vendorService.submitForReview(request.vendorId, agreementDate);
  return response.status(200).send({ success: true });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.getMe = async (request, response) => {
  const vendor = await vendorService.getVendor({
    id: request.vendorId,
  });
  delete vendor.password;

  return response.send({
    success: true,
    ...vendor,
    vendorId: vendor.id,
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.login = async (request, response) => {
  const [isCorrectData, code] = await vendorService.tryToLogin(
    request.body.receiver.toLowerCase(),
    request.body.password
  );
  if (!isCorrectData) {
    this.loginFailureLimiter.addTrial(getRequestIp(request));
    return response.status(400).send({
      success: false,
      message: 'This email/phone, and password doesnt match our records',
    });
  }
  if (code) {
    return response.status(201).send({ success: true, twoStepVerify: true });
  }

  const {
    id,
    commercialName,
    email,
    ownerFirstName,
    ownerLastName,
    profilePictureUrl,
    logoUrl,
    allow_twostepverify,
    refundListStatuses,
    revenueShareEnabled,
    revenueSharePercentage,
    status,
  } = await vendorService.getVendor({
    identifier: request.body.receiver.toLowerCase(),
  });

  if (status === 'ARCHIVED') {
    return response.status(400).send({
      success: false,
      message:
        'Your account is not allowed to be accessed at this time, please contect Apace Refunds',
    });
  }

  const vendorJWT = await generateVendorJWT(id);

  return response.send({
    success: true,
    token: vendorJWT,
    commercialName,
    email,
    ownerFirstName,
    ownerLastName,
    profilePictureUrl,
    logoUrl,
    allow_twostepverify,
    vendorId: id,
    refundListStatuses,
    revenueShareEnabled,
    revenueSharePercentage,
    status,
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.adminLogin = async (request, response, next) => {
  try {
    const jwtToken = request.body.adminVendorToken;
    const { id: vendorId } = jwt.verify(jwtToken, process.env.JWT_SECRET);

    if (!vendorId) {
      this.loginFailureLimiter.addTrial(getRequestIp(request));
      return response.status(400).send({
        success: true,
        message: 'Invalid authentication token.',
      });
    }

    const {
      id,
      commercialName,
      email,
      ownerFirstName,
      ownerLastName,
      profilePictureUrl,
      logoUrl,
      allow_twostepverify,
      refundListStatuses,
      revenueShareEnabled,
      revenueSharePercentage,
      status,
    } = await vendorService.getVendor({
      identifier: null,
      id: vendorId,
    });

    if (status === 'ARCHIVED') {
      return response.status(400).send({
        success: false,
        message:
          'Your account is not allowed to be accessed at this time, please contect Apace Refunds',
      });
    }
    const vendorJWT = await generateVendorJWT(id);

    return response.send({
      success: true,
      token: vendorJWT,
      commercialName,
      email,
      ownerFirstName,
      ownerLastName,
      profilePictureUrl,
      logoUrl,
      allow_twostepverify,
      vendorId: id,
      refundListStatuses,
      revenueShareEnabled,
      revenueSharePercentage,
      status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.twoFactorAuth = async (request, response) => {
  const [isCorrectData] = await vendorService.tryToLogin(
    request.body.receiver.toLowerCase(),
    request.body.password
  );
  const verificationMethod = VerificationFactory(
    request.body.receiver.toLowerCase()
  );

  const isValid = await verificationMethod.verifyCode(request.body.code);
  if (!isValid || !isCorrectData) {
    this.twoFactorFailureLimiter.addTrial(getRequestIp(request));
    return response
      .status(400)
      .send({ success: false, message: 'This code doesnt match our records' });
  }
  const {
    id,
    commercialName,
    email,
    ownerFirstName,
    ownerLastName,
    profilePictureUrl,
    revenueShareEnabled,
    revenueSharePercentage,
  } = await vendorService.getVendor({
    identifier: request.body.receiver.toLowerCase(),
  });
  const vendorJWT = await generateVendorJWT(id);
  response.send({
    success: true,
    token: vendorJWT,
    commercialName,
    email,
    ownerFirstName,
    ownerLastName,
    profilePictureUrl,
    revenueShareEnabled,
    revenueSharePercentage,
    vendorId: id,
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.createNewApiKey = async (request, response) => {
  const createdApiKey = await vendorService.addVendorTokens(
    request.vendorId,
    request.body.name
  );
  if (!createdApiKey) {
    return response.status(500).send({
      success: false,
      message: 'Something wrong happended, please try again',
    });
  }
  response.send({
    success: true,
    createdApiKey,
    message:
      "Please keep those credentials in a secret placee. Keep sure you saved it before closing the page, as it won't be send back again.",
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getApiKeys = async (request, response) => {
  const apiKeys = await vendorService.getVendorKeys(request.vendorId);
  response.send({ success: true, apiKeys });
};

/**
 *  @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.deleteApiKey = async (request, response, next) => {
  const isDeleted = await vendorService.deleteVendorKey(
    request.params.publicId,
    request.vendorId
  );
  if (!isDeleted) {
    return next(new NotFoundError('publicId'));
  }
  response.send({
    success: true,
    message: 'This api key was deleted successfully.',
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.createPaymentToken = async (request, response) => {
  let paymentToken;
  if (request.body.dwolla) {
    paymentToken = await Dwolla.createCardFundingSourceToken({
      customerEmail: request.vendor.email,
    });
  } else {
    paymentToken = await Plaid.createPlaidToken(request.vendorId);
  }

  response.send({ success: true, paymentToken });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getCustomers = async (request, response) => {
  let customersData;
  const options = {
    search: request.query.search || '',
    orderBy: request.query.orderBy || '',
    orderDirection: request.query.orderDirection || '',
  };

  if (request.query.filter === 'disabled') {
    customersData = await vendorService.getDisabledCustomers(
      request.vendorId,
      Number.parseInt(request.query.cursor) || null,
      Number.parseInt(request.query.pageLength) || null,
      options
    );
  } else if (request.query.filter === 'enabled') {
    customersData = await vendorService.getEnabledCustomers(
      request.vendorId,
      Number.parseInt(request.query.cursor) || null,
      Number.parseInt(request.query.pageLength) || null,
      options
    );
  } else {
    customersData = await vendorService.getVendorCustomers(
      request.vendorId,
      Number.parseInt(request.query.cursor) || null,
      Number.parseInt(request.query.pageLength) || null,
      options
    );
  }
  const stats = await vendorService.getVendorCustomersStats(request.vendorId);
  response.send({ success: true, ...customersData, stats });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getDisabledCustomers = async (request, response) => {
  const disabledCustomers = await vendorService.getDisabledCustomers(
    request.vendorId
  );
  response.send({ success: true, disabledCustomers });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.addDisabledCustomers = async (request, response) => {
  try {
    await vendorService.addDisabledCustomers(
      request.vendorId,
      request.body.customers
    );
    response.send({ success: true });
  } catch (ex) {
    response.status(400).send({ success: false, message: ex.message });
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.removeDiasbledCustomers = async (request, response) => {
  try {
    await vendorService.removeDisabledCustomers(
      request.vendorId,
      request.body.customers
    );
    response.send({ success: true });
  } catch (error) {
    response.status(400).send({
      success: false,
      message: error.message || 'Some of those customers are not disabled!',
    });
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.sendForgotCode = async (request, response) => {
  const codeIsSent = await vendorService.sendForgotCode(
    request.params.receiver.toLocaleLowerCase()
  );
  if (codeIsSent) {
    return response.send({ success: true });
  }
  response.status(400).send({ success: false });
};

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.forgotPassword = async (request, response) => {
  const verificationMethod = VerificationFactory(
    request.params.receiver.toLowerCase()
  );
  const isValid = await verificationMethod.verifyCode(request.body.code);
  if (!isValid) {
    return response.status(400).send({
      success: false,
      message: 'This code does not match our records',
    });
  }
  const passwordChanged = await vendorService.changePassword(
    request.params.receiver.toLocaleLowerCase(),
    request.body.password
  );
  if (passwordChanged) {
    return response.send({
      success: true,
      message: 'Password has been changed successfully.',
    });
  }
  response.status(400).send({
    success: false,
    message: 'You can not use the same password twice!',
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.changePassword = async (request, response) => {
  const passwordChanged = await vendorService.changePassword(
    request.vendor.email,
    request.body.password
  );
  if (passwordChanged) {
    return response.send({ success: true });
  }
  response.status(400).send({
    success: false,
    message: 'You can not use the same password twice!!',
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.updateVendorData = async (request, response, next) => {
  try {
    const updatedVendor = await vendorService.updateVendor(
      request.vendorId,
      request.body
    );
    if (updatedVendor) {
      return response.send({ success: true, vendorData: updatedVendor });
    }
    response.status(400).send({ success: false });
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
module.exports.updateVendorLogo = async (request, response, next) => {
  try {
    const updatedVendor = await vendorService.updateVendorLogo(
      request.vendorId,
      request.body.logoUrl
    );
    if (updatedVendor) {
      return response.send({ success: true, logoUrl: updatedVendor.logoUrl });
    }
    response.status(400).send({ success: false });
  } catch (error) {
    next(error);
  }
};

/**
 * @todo
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.addPaymentMethod = async (request, response) => {
  const vendorData = await vendorService.getVendor({
    id: request.vendorId,
  });
  try {
    await Dwolla.createFundingSourceFromBankAccount(
      request.body.publicToken,
      request.body.accountId,
      {
        email: vendorData.email,
        name: vendorData.ownerFirstName.concat(' ', vendorData.ownerLastName),
      },
      false
    );
    await updateVendorStatusPublisher(request.vendorId);
    response.send({ success: true });
  } catch (error) {
    logger.error(error);
    response.status(400).send({ success: false });
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getPaymentMethods = async (request, response) => {
  const paymentMethods = await vendorService.getPaymentMethods(
    request.vendorId,
    request.query.filter
  );
  response.send({ success: true, ...paymentMethods });
};

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.deletePaymentMethod = async (request, response) => {
  const fundingSource = request.query.fundingSource.toString();
  const vendor = await vendorService.deleteVendorPaymentMethod(
    request.vendorId,
    fundingSource
  );
  if (vendor) {
    await updateVendorStatusPublisher(request.vendorId);
    return response.send({ success: true });
  }
  response.status(400).send({
    success: false,
    message: 'Something went wrong while trying to delete this payment method',
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.updateAllowAutopay = async (request, response) => {
  const { allow_autopay } = request.body;
  const vendor = await vendorService.getVendor({ id: request.vendorId });

  if (!allow_autopay && vendor.invoicingCycleType === 'Daily') {
    return response.status(400).send({
      success: false,
      message: "Can't disable autopay while being enrolled in daily invoicing",
    });
  }

  if (allow_autopay && !vendor.defaultCardId) {
    return response.status(400).send({
      success: false,
      message: "Can't enable autopay without having a default card",
    });
  }

  await vendorService.updateAllowAutopay(request.vendorId, allow_autopay);

  return response.send({ success: true, allow_autopay });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.updateSetupEnabled = async (request, response) => {
  const { setupEnabled } = request.body;

  await vendorService.updateSetupEnabled(request.vendorId, setupEnabled);

  return response.send({ success: true, setupEnabled });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.updateRevenueShareEnabled = async (request, response) => {
  const { revenueShareEnabled } = request.body;

  await vendorService.updateRevenueShareEnabled(
    request.vendorId,
    revenueShareEnabled
  );

  return response.send({ success: true, revenueShareEnabled });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getVendorStats = async (request, response) => {
  // get selections, queries, and put the default for it
  console.log('vendor =========================', typeof request.vendorId);
  const vendorStats = await vendorService.getVendorStats({
    vendorId: request.vendorId,
    startDate: new Date(request.query.startDate),
    endDate: new Date(request.query.endDate),
    groupBy: request.query.groupBy || 'day',
    selections: request.query.select
      ? Array.isArray(request.query.select)
        ? request.query.select
        : [request.query.select]
      : [],
  });
  const statsSummation = vendorFormulator.sumAllElements(vendorStats);
  const statsFilledAllZeros = vendorFormulator.fillTimeSeries({
    data: vendorStats,
    startDate: request.query.startDate,
    endDate: request.query.endDate,
    timeUnit: request.query.groupBy || 'day',
  });
  response.send({
    records: statsFilledAllZeros,
    totalValues: statsSummation,
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.addDefaultPaymentMethod = async (request, response) => {
  // Keep sure this payment method attached to same vendor
  if (
    !(await vendorService.vendorOwnsPaymentMethod(
      request.vendorId,
      request.body.fundingSource
    ))
  ) {
    return response.status(400).send({
      success: false,
      message:
        "You don't own this payment method, you are not allowed to use it!!",
    });
  }
  try {
    await vendorService.addDefaultFundingSource(
      request.vendorId,
      request.body.fundingSource
    );
    response.send({ success: true });
  } catch (error) {
    logger.error(error);
    response.status(500).send('Something wrong happened');
  }
};

module.exports.getVendorRevenueShares = async (request, response) => {
  const { vendorId } = request.params;
  const { cursor, pageLength, page } = request.query;

  try {
    const data = await vendorService.getVendorRevenueShares(
      vendorId,
      cursor,
      pageLength,
      page
    );

    response.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    response.status(500).send('Something wrong happened');
  }
};

module.exports.getVendorAvailableRevenueShare = async (request, response) => {
  const { vendorId } = request.params;

  try {
    const data = await vendorService.getVendorAvailableRevenueShare(vendorId);

    response.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    response.status(500).send('Something wrong happened');
  }
};
