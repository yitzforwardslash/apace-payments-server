const {
  vendorBankAccount: vendorBankAccount,
  vendor: Vendor,
  vendorPaymentMethod: VendorPaymentMethod,
} = require('../../../prisma/prismaClient');
const Encrypt = require('../../../utils/Encrypt');

const getVendorBankAccountByNumber = async (accountNumber, vendorId) => {
  const vendorBankAccounts = await vendorBankAccount.findMany({
    where: {
      vendorId,
    },
    select: {
      id: true,
      name: true,
      accountNumber: true,
    },
  });

  const decryptedNumbers = vendorBankAccounts.map((bankaccount) =>
    Encrypt.decrypt(bankaccount.accountNumber)
  );

  if (decryptedNumbers.includes(accountNumber)) {
    const bankaccountIndex = decryptedNumbers.indexOf(accountNumber);
    delete vendorBankAccounts[bankaccountIndex].accountNumber;
    delete vendorBankAccounts[bankaccountIndex].routingNumber;
    return vendorBankAccounts[bankaccountIndex];
  }

  return false;
};

/**
 * @typedef {Object} BankData
 * @property {String} accountNumber
 * @property {String} routingNumber
 * @property {String} name
 */

/**
 * @param {BankData} data
 * @param {String} vendorId
 */
const createNewBankAccount = async (data, vendorId) => {
  const { accountNumber, routingNumber, name } = data;
  const accountNumberLastFour = accountNumber.slice(accountNumber.length - 4);
  const routingNumberLastFour = routingNumber.slice(routingNumber.length - 4);

  const paymentMethod = await VendorPaymentMethod.create({
    data: {
      vendor: {
        connect: {
          id: vendorId,
        },
      },

      type: 'bank',
      vendorBankAccount: {
        create: {
          vendor: {
            connect: {
              id: vendorId,
            },
          },
          name,
          accountNumber: Encrypt.encrypt(accountNumber),
          accountNumberLastFour,
          routingNumber: Encrypt.encrypt(routingNumber),
          routingNumberLastFour,
        },
      },
    },
    select: {
      vendorBankAccount: {
        select: {
          id: true,
          name: true,
          accountNumberLastFour: true,
          routingNumberLastFour: true,
        },
      },
    },
  });

  return paymentMethod.vendorBankAccount;
};

const setDefaultBankAccount = async (vendorId, bankaccountId) => {
  const bankAccount = await vendorBankAccount.findFirst({
    where: { vendorId, id: bankaccountId },
    include: {
      vendorPaymentMethod: true,
    },
  });
  if (bankAccount && bankAccount.vendorPaymentMethod.length) {
    await Vendor.update({
      where: {
        id: vendorId,
      },
      data: {
        defaultPaymentMethod: {
          connect: {
            id: bankAccount.vendorPaymentMethod[0].id,
          },
        },
      },
    });
  }
  return true;
};

const deleteBankAccount = async (vendorId, bankaccountId) => {
  const bankaccount = await vendorBankAccount.findFirst({
    where: {
      vendorId,
      id: bankaccountId,
    },
  });

  if (!bankaccount) {
    throw new Error('Invalid bankaccount id');
  }

  return vendorBankAccount.delete({ where: { id: bankaccountId } });
};

module.exports = {
  getVendorBankAccountByNumber,
  setDefaultBankAccount,
  createNewBankAccount,
  deleteBankAccount,
};
