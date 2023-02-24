const plaid = require('plaid');
const logger = require('./Logger');

const PlaidClient = new plaid.Client({
  clientID:
    process.env.NODE_ENV === 'production'
      ? process.env.PLAID_CLIENT_ID_PROD
      : process.env.PLAID_CLIENT_ID,
  secret:
    process.env.NODE_ENV === 'production'
      ? process.env.PLAID_SECRET_PROD
      : process.env.PLAID_SECRET,
  env:
    process.env.NODE_ENV === 'production'
      ? plaid.environments.production
      : plaid.environments.sandbox,
});

PlaidClient.createPlaidToken = async (customerId) => {
  try {
    const { status_code, link_token, request_id } =
      await PlaidClient.createLinkToken({
        user: {
          client_user_id: customerId.toString(),
        },
        client_name: 'APACE APP',
        products: ['auth', 'transactions'],
        country_codes: ['US'],
        language: 'en',
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings'],
          },
        },
      });
    if (status_code !== 200) {
      logger.error(
        'Plaid create token problem with request id ',
        request_id,
        'has failed with status ',
        status_code
      );
      return;
    }
    return link_token;
  } catch (error) {
    logger.error(error);
    return;
  }
};

module.exports = PlaidClient;
