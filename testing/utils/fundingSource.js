const { addToDwolla } = require('../../modules/customer/customer.utils');
const Dwolla = require('../../utils/Dwolla');
const Plaid = require('../../utils/Plaid');

module.exports.debitCard = {
  fundingSourceLink:
    'https://api-sandbox.dwolla.com/funding-sources/ee64c87c-78ee-447c-bec3-a1b2e165c984',
  lastFour: '1111',
  differentLastFour: '1234',
  email: 'tt5@mailinator.com',
  fullNumberCard: '4000056655665556',
  lastFourFullNumberCard: '5556',
};

module.exports.bankAccount = {
  id: '9b2a93da-e5f6-411f-b06b-4f4abb87efa2',
  status: 'verified',
  type: 'bank',
  bankAccountType: 'checking',
  name: 'hj hjh',
  created: '2021-06-17T23:57:40.336Z',
  removed: false,
  channels: ['ach', 'real-time-payments'],
  bankName: 'SANDBOX TEST BANK',
  fingerprint:
    'a5aed9a124fd115bf7c1939eb6cb3b43e099a6a4dacbd20374bb92cdff1be1f3',
  fundingSource:
    'https://api-sandbox.dwolla.com/funding-sources/9b2a93da-e5f6-411f-b06b-4f4abb87efa2',
  email: 'lol@mailinator.com',
};

module.exports.creditCard = {
  fullNumber: '5555555555554444',
  lastFour: '4444',
  differentLastFour: '1244',
  expirationMonth: 4,
  expirationYear: 2030,
};

module.exports.accountWithOneDebitAndBank = {
  email: 'apace@forwardslashsoftware.com',
  lastFour: '2518',
  differentLastFour: '2517',
  id: 'a3407687-fd1a-44f6-9219-943b639f8477',
};

module.exports.accountWithManyDebitsAndBank = {
  email: 'yitzchokdancziger@gmail.com',
  lastFour: '1120',
  differentLastFour: '1121',
  id: '01121707-3e49-4952-b16b-84a204bab79a',
};

module.exports.getPlaidToken = async () => {
  const publicTokenResponse = await Plaid.sandboxPublicTokenCreate(
    'ins_115528',
    ['auth', 'transactions']
  );
  const exchangeTokenResponse = await Plaid.exchangePublicToken(
    publicTokenResponse.public_token
  );
  const accessToken = exchangeTokenResponse.access_token;
  const { accounts } = await Plaid.getAccounts(accessToken);
  return {
    publicToken: publicTokenResponse.public_token,
    accountId: accounts[0].account_id,
  };
};

module.exports.getDeletedFundingSource = async (email) => {
  const publicTokenResponse = await Plaid.sandboxPublicTokenCreate(
    'ins_115528',
    ['auth', 'transactions']
  );
  const exchangeTokenResponse = await Plaid.exchangePublicToken(
    publicTokenResponse.public_token
  );
  const accessToken = exchangeTokenResponse.access_token;
  const [{ accounts }] = await Promise.all([
    Plaid.getAccounts(accessToken),
    addToDwolla({
      firstName: 'f',
      lastName: 'm',
      email,
    }),
  ]);
  const fundingSource = await Dwolla.createFundingSourceFromBankAccount(
    publicTokenResponse.public_token,
    accounts[0].account_id,
    { email, name: 'test' },
    false
  );
  await Dwolla.client.post(fundingSource, { removed: true });
  return fundingSource;
};
