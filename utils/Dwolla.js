const Client = require('dwolla-v2').Client;
const logger = require('../utils/Logger');
const WEBHOOK_URL = process.env.API_URL.concat(
  process.env.WEBHOOK_LISTENER_PATH
);
const { NoRtpSupport } = require('../utils/CustomError');
/**
 * @param {Array} channels
 * @returns {Boolean}
 */
const supportsRTP = (channels) =>
  channels.includes(process.env.REAL_TIME_PAYMENTS);
const Plaid = require('./Plaid');

/**
 * @typedef {Object} BankAccount
 * @property {String} id
 * @property {String} bankName
 * @property {String} status
 * @property {String} bankAccountType
 * @property {String} fundingSourceLink
 */

/**
 * @typedef {Object} DebitCard
 * @property {String} id
 * @property {String} name
 * @property {String} brand
 * @property {String} lastFour
 * @property {String} fundingSourceLink
 * @property {Number} expirationMonth
 * @property {Number} expirationYear
 */
class Dwolla {
  static client = new Client({
    key:
      process.env.NODE_ENV === 'production'
        ? process.env.DWOLLA_KEY_PROD
        : process.env.DWOLLA_KEY,
    secret:
      process.env.NODE_ENV === 'production'
        ? process.env.DWOLLA_SECRET_PROD
        : process.env.DWOLLA_SECRET,
    environment:
      process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  });
  static async findMasterBalance() {
    const balance = await Dwolla.client
      .get('/')
      .then((res) =>
        Dwolla.client.get(`${res.body._links.account.href}/funding-sources`)
      )
      .then((res) => {
        const allFunding = res.body._embedded['funding-sources'];
        const balance = allFunding.find(
          (funding) => funding.type === 'balance'
        );
        return balance._links.self.href;
      });
    this.balance = balance;
  }

  static createTransactionLink(transferRequest) {
    return this.client
      .post('transfers', transferRequest)
      .then((response) => response.headers.get('location'));
  }

  static async createTransaction({
    receiverFund,
    senderFund,
    transactionAmount,
  }) {
    if (!receiverFund) {
      receiverFund = await this.balance;
    } else {
      senderFund = await this.balance;
    }
    const transferRequest = {
      _links: {
        source: {
          href: senderFund,
        },
        destination: {
          href: receiverFund,
        },
      },
      amount: {
        currency: 'USD',
        value: transactionAmount,
      },
    };
    const fundingSourceType = await this.getFundingSourceType({
      fundingSourceLink: receiverFund,
    });
    if (process.env.NODE_ENV === 'production' && fundingSourceType === 'bank') {
      transferRequest.processingChannel = { destination: 'real-time-payments' };
    }
    const transactionLink = await this.createTransactionLink(transferRequest);
    if (!transactionLink) {
      return;
    }
    return this.client.get(transactionLink).then((transaction) => ({
      status: transaction.body.status,
      link: transactionLink,
    }));
  }

  static createBankAccountFundingSource(
    dwollaCustomerLink,
    customerName,
    plaidProcessorToken,
    rtpSupportRequired = true
  ) {
    return this.client
      .post(`${dwollaCustomerLink}/funding-sources`, {
        plaidToken: plaidProcessorToken,
        name: customerName,
      })
      .then(async (dwollaResponse) => {
        const fundingSource = dwollaResponse.headers.get('location');
        const bankAccount = await this.getFundingSourceData(
          fundingSource,
          false
        );
        if (rtpSupportRequired && !supportsRTP(bankAccount.channels)) {
          await this.deleteFundingSource(fundingSource);
          throw new NoRtpSupport();
        } else {
          return fundingSource;
        }
      });
  }

  static deleteFundingSource(fundingSourceUrl) {
    return this.client.post(fundingSourceUrl, { removed: true });
  }

  static createDwollaReceiveOnlyCustomer(firstName, lastName, email) {
    return this.client
      .post('customers', {
        firstName,
        lastName,
        email,
        type: 'receive-only',
      })
      .then((dwollaResponse) => dwollaResponse.headers.get('location'))
      .catch((error) => {
        if (error.body && error.body._embedded.errors[0].code == 'Duplicate') {
          //User already has an account with dwolla
          return error.body._embedded.errors[0]._links.about.href;
        }
        logger.error(error);
        return;
      });
  }

  static createDwollaUnverifiedCustomer(vendorData) {
    return this.client
      .post('customers', {
        ...vendorData,
      })
      .then((dwollaResponse) => dwollaResponse.headers.get('location'))
      .catch((error) => {
        if (error.body && error.body._embedded.errors[0].code == 'Duplicate') {
          //User already has an account with dwolla
          return error.body._embedded.errors[0]._links.about.href;
        }
        logger.error(error);
        return;
      });
  }

  // Should refactor other using it when merge instead of sending url, send email directly
  static async createCardFundingSourceToken({ customerEmail, customerUrl }) {
    const dwollaCustomer =
      customerUrl || (await this.getDwollaCustomer(customerEmail));
    return this.client
      .post(`${dwollaCustomer}/card-funding-sources-token`)
      .then((dwollaResponse) => dwollaResponse.body.token)
      .catch((error) => logger.error(error));
  }
  static getDwollaCustomer(email) {
    return this.client
      .get(`customers?email=${email}`)
      .then((dwollaResponse) => {
        return dwollaResponse.body._embedded.customers[0]?._links?.self.href;
      })
      .catch((error) => logger.error(error));
  }

  static async getDwollaCustomerFundingSources(email) {
    try {
      const customer = await this.getDwollaCustomer(email);
      if (!customer) {
        return [];
      }
      return this.client
        .get(`${customer}/funding-sources`)
        .then((dwollaResponse) =>
          dwollaResponse.body._embedded['funding-sources']
            .filter((fundingSource) => !fundingSource.removed)
            .map((fundingSource) => ({
              ...fundingSource,
              fundingSource: fundingSource._links.self.href,
            }))
        );
    } catch (error) {
      logger.error(error);
    }
  }

  static async getDwollaCustomerDeletedFundingSources(email) {
    const customer = await this.getDwollaCustomer(email);
    return this.client
      .get(`${customer}/funding-sources`)
      .then((dwollaResponse) =>
        dwollaResponse.body._embedded['funding-sources'].filter(
          (fundingSource) => fundingSource.removed
        )
      );
  }

  /**
   * @param {String} email
   * @returns {Promise<Array<BankAccount>>}
   */
  static async getDwollaCustomerBankAccounts(email) {
    return this.getDwollaCustomerFundingSources(email).then(
      async (fundingSources) =>
        fundingSources
          ? Promise.all(
              fundingSources
                .filter((fundingSource) => fundingSource.type === 'bank')
                .map(async (bank) => ({
                  fundingSourceLink: bank.fundingSource,
                  bankAccountType: bank.bankAccountType,
                  name: bank.name,
                  bankName: bank.bankName,
                  channels: bank.channels,
                  logo: await this.getBankLogo(bank.bankName),
                }))
            )
          : []
    );
  }

  /**
   * @param {String} email
   * @returns {Promise<Array<DebitCard>>}
   */
  static async getDwollaCustomerCards(email) {
    return this.getDwollaCustomerFundingSources(email).then((fundingSources) =>
      fundingSources
        ? fundingSources
            .filter((fundingSource) => fundingSource.type === 'card')
            .map((debitCard) => ({
              fundingSourceLink: debitCard.fundingSource,
              ...debitCard.cardDetails,
            }))
        : []
    );
  }

  static getDebitDetails(fundingSource) {
    return this.client
      .get(fundingSource)
      .then((source) => ({
        ...source.body.cardDetails,
        customer: source.body._links.customer.href,
      }))
      .catch((error) => logger.error(error));
  }

  static getFundingSourceData(fundingSource, filter = true) {
    return this.client.get(fundingSource).then((source) =>
      source.body.type === 'bank'
        ? filter
          ? {
              bankName: source.body.bankName,
              bankAccountType: source.body.bankAccountType,
            }
          : {
              id: source.body.id,
              bankName: source.body.bankName,
              bankAccountType: source.body.bankAccountType,
              status: source.body.status,
              name: source.body.name,
              createdAt: source.body.created,
              channels: source.body.channels,
            }
        : source.body.type === 'balance'
        ? { status: source.body.status, balance: source.body.balance }
        : {
            ...source.body.cardDetails,
            name: source.body.cardDetails.nameOnCard,
            type: 'card',
          }
    );
  }

  /**
   *
   * @param {String} fundingSource
   * @returns {Object}
   */
  static getFundingSourceOwner(fundingSource) {
    return this.client
      .get(fundingSource)
      .then((result) =>
        this.getDwollaCustomerData(result.body._links.customer.href)
      );
  }

  static getDwollaCustomerData(customerLink) {
    return this.client.get(customerLink).then((result) => {
      const customerData = result.body;
      return {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        businessName: customerData.businessName,
        createdAt: customerData.created,
      };
    });
  }

  static createWebhookSubscription() {
    return this.client.post('webhook-subscriptions', {
      url: WEBHOOK_URL,
      secret: process.env.WEBHOOK_SECRET,
    });
  }

  static isWebhookSubscribed() {
    return this.client
      .get('webhook-subscriptions')
      .then((result) => result.body.total >= 1);
  }

  static syncWebhook() {
    this.isWebhookSubscribed().then(async (subscribed) => {
      if (subscribed) {
        const currentWebhook = (await this.client.get('webhook-subscriptions'))
          .body._embedded['webhook-subscriptions'][0];
        if (currentWebhook.url !== WEBHOOK_URL) {
          this.client
            .delete(
              `https://api-sandbox.dwolla.com/webhook-subscriptions/${currentWebhook.id}`
            )
            .then(() => logger.info('Removed old webhook'));
          this.createWebhookSubscription().then(() =>
            logger.info('Added new webhook')
          );
        }
      } else {
        this.createWebhookSubscription().then(() =>
          logger.info('Added new webhook')
        );
      }
    });
  }

  static getTransactionStatus(transactionLink) {
    return this.client
      .get(transactionLink)
      .then((result) => result.body.status);
  }

  static findMasterBalance() {
    this.balance = Dwolla.client
      .get('/')
      .then((res) =>
        Dwolla.client.get(`${res.body._links.account.href}/funding-sources`)
      )
      .then((res) => {
        const allFunding = res.body._embedded['funding-sources'];
        const balance = allFunding.find(
          (funding) => funding.type === 'balance'
        );
        return balance._links.self.href;
      });
  }
  static getTransactionReceiver(transactionLink) {
    return this.client
      .get(transactionLink)
      .then((result) => result.body._links['destination-funding-source'].href)
      .then((fundingSource) => this.getFundingSourceData(fundingSource, false))
      .catch((error) => logger.error(error));
  }
  static async getFundingSourceType({ fundingSourceData, fundingSourceLink }) {
    if (!fundingSourceData) {
      fundingSourceData = await this.getFundingSourceData(fundingSourceLink);
    }
    return fundingSourceData.type && fundingSourceData.type !== 'bank'
      ? 'card'
      : 'bank';
  }
  /**
   * @param {String} publicToken
   * @param {String} accountId
   * @param {Object} userData
   * @param {Boolean} rtpSupportRequired
   */
  static async createFundingSourceFromBankAccount(
    publicToken,
    accountId,
    { email, name },
    rtpSupportRequired = true
  ) {
    const { access_token: accessToken } = await Plaid.exchangePublicToken(
      publicToken
    );
    const { processor_token: processorToken } =
      await Plaid.createProcessorToken(accessToken, accountId, 'dwolla');
    const dwollaCustomerLink = await this.getDwollaCustomer(email);
    console.log({ dwollaCustomerLink });
    if (!dwollaCustomerLink) {
      return;
    }
    return this.createBankAccountFundingSource(
      dwollaCustomerLink,
      name,
      processorToken,
      rtpSupportRequired
    );
  }

  static getBankLogo(bankName) {
    return new Promise((resolve, reject) => {
      Plaid.searchInstitutionsByName(
        bankName,
        ['transactions'],
        ['US'],
        { include_optional_metadata: true },
        (error, response) => {
          if (error) {
            reject(error);
          } else {
            if (!response || response.institutions.length === 0) {
              return resolve(null);
            }
            resolve(response.institutions[0].logo);
          }
        }
      );
    });
  }
}

// async function main() {
//   const sources = await Dwolla.getDwollaCustomerFundingSources(
//     'shaniya.cronin44@yahoo.com'
//   );
//   console.log(sources);
// }
// main().then(console.log).catch(console.log);

module.exports = Dwolla;
