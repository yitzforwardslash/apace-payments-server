const vendorService = require('../vendor.service');
const bankAccountService = require('./bankAccount.service');
const { getVendor } = require('../vendor.service');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
 */
const createNewBankAccount = async (request, response, next) => {
  const { routingNumber, accountNumber, name } = request.body;

  try {
    const vendor = await getVendor({ id: request.vendorId });
    const existingBankAccount =
      await bankAccountService.getVendorBankAccountByNumber(
        accountNumber,
        request.vendorId
      );
    if (existingBankAccount) {
      return response.send({
        success: true,
        bankAccount: existingBankAccount,
      });
    }

    const bankAccount = await bankAccountService.createNewBankAccount(
      {
        routingNumber,
        accountNumber,
        name,
      },
      request.vendorId
    );
    if (!vendor.defaultPaymentMethodId) {
      await bankAccountService.setDefaultBankAccount(
        request.vendorId,
        bankAccount.id
      );
    }

    return response.send({
      success: true,
      bankAccount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
const updateDefaultBankAccount = async (request, response) => {
  const { bankAccountId } = request.body;
  const isVendorBankAccount = await vendorService.isVendorBankAccount(
    request.vendorId,
    bankAccountId
  );

  if (!isVendorBankAccount) {
    return response
      .status(400)
      .send({ success: false, message: 'Invalid bank account id' });
  }

  await bankAccountService.setDefaultBankAccount(request.vendorId, bankAccountId);

  return response.send({ success: true });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
const getVendorBankAccounts = async (request, response) => {
  const bankAccounts = await vendorService.getVendorBankAccounts(
    request.vendorId
  );

  return response.send({
    success: true,
    bankAccounts,
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
const deleteBankAccount = async (request, response) => {
  const bankAccountId = parseInt(request.params.bankAccountId);
  const isVendorBankAccount = await vendorService.isVendorBankAccount(
    request.vendorId,
    bankAccountId
  );

  if (!isVendorBankAccount) {
    return response
      .status(400)
      .send({ success: false, message: 'Invalid bankAccount id' });
  }

  await bankAccountService.deleteBankAccount(request.vendorId, bankAccountId);

  return response.send({ success: true });
};

module.exports = {
  createNewBankAccount,
  getVendorBankAccounts,
  deleteBankAccount,
  updateDefaultBankAccount,
};
