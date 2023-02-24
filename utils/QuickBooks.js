const { default: axios } = require('axios');
const crypto = require('crypto');
const tunnel = require('tunnel');
const fs = require('fs');
const path = require('path');
const OAuthClient = require('intuit-oauth');

const {
  QUICKBOOKS_CLIENT_ID,
  QUICKBOOKS_CLIENT_SECRET,
  QUICKBOOKS_REDIRECT_PATH,
  API_URL,
} = process.env;

const QUICKBOOKS_API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://quickbooks.api.intuit.com/v3/company'
    : 'https://sandbox-quickbooks.api.intuit.com/v3/company';
class QuickBooks {
  // Instance of client
  static oauthClient = new OAuthClient({
    clientId: QUICKBOOKS_CLIENT_ID,
    clientSecret: QUICKBOOKS_CLIENT_SECRET,
    environment: process.env.NODE_ENV || 'sandbox',
    redirectUri: `${API_URL}${QUICKBOOKS_REDIRECT_PATH}`,
  });

  static isWebhookSignatureValid(signature, payload) {
    const hash = crypto
      .createHmac('sha256', process.env.QUICKBOOKS_WEBHOOK_VERIFY_TOKEN)
      .update(JSON.stringify(payload))
      .digest('base64');
    return signature === hash;
  }

  static async request({ path, method, data, params, realmId, token }) {
    return axios({
      method,
      url: `${QUICKBOOKS_API_URL}/${realmId}${path}`,
      params: params ? { ...params, minorversion: 65 } : { minorversion: 65 },
      data,
      headers: {
        Authorization: 'Bearer ' + token.access_token,
        Accept: 'application/json',
      },
    });
  }

  static generateAuthUrl() {
    // AuthorizationUri
    const authUri = QuickBooks.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.Payment],
      state: 'testState',
    }); // can be an array of multiple scopes ex : {scope:[OAuthClient.scopes.Accounting,OAuthClient.scopes.OpenId]}

    return authUri;
  }

  static async parseCallback(url) {
    const token = (await QuickBooks.oauthClient.createToken(url)).getJson();

    return token;
  }

  static async refreshAccessToken(token) {
    const newToken = (
      await QuickBooks.oauthClient.refreshUsingToken(token)
    ).getJson();
    return newToken;
  }

  static setToken(token) {
    QuickBooks.oauthClient.setToken(token);
  }

  static async getUserInfo(token, realmId) {
    const response = await QuickBooks.request({
      path: `/companyinfo/${realmId}`,
      method: 'GET',
      token,
      realmId,
    });

    return response.data;
  }

  /**
   *
   * @typedef {Object} BillAddr
   * @property {String} CountrySubDivisionCode
   * @property {String} City
   * @property {String} PostalCode
   * @property {String} Line1
   * @property {String} Country
   */

  /**
   *
   * @typedef {Object} PrimaryEmailAddr
   * @property {String} Address
   */

  /**
   * @typedef {PrimaryPhone} PrimaryPhone
   * @property {String} FreeFormNumber
   */

  /**
   * @typedef {Object} Customer
   * @property {String} DisplayName
   * @property {String} CompanyName
   * @property {String} GivenName
   * @property {String} MiddleName
   * @property {String} FamilyName
   * @property {BillAddr} BillAddr
   * @property {PrimaryEmailAddr} PrimaryEmailAddr
   * @property {PrimaryPhone} PrimaryPhone
   */

  /**
   *
   * @param {Customer} customerData
   */
  static async createCustomer(token, realmId, customerData) {
    const response = await QuickBooks.request({
      path: '/customer',
      method: 'POST',
      token,
      realmId,
      data: customerData,
    });

    return response.data.Customer;
  }

  /**
   *
   * @param {Object} token
   * @param {String} realmId
   * @param {String} id
   * @param {String} syncToken
   * @param {Customer} customerData
   */
  static async updateCustomer(token, realmId, id, syncToken, customerData) {
    const response = await QuickBooks.request({
      path: `/customer`,
      method: 'POST',
      token,
      realmId,
      data: {
        ...customerData,
        Id: id,
        SyncToken: syncToken,
      },
    });

    return response.data.Customer;
  }

  /**
   * @typedef LineItem
   * @property {String} DetailType
   * @property {Number} Amount
   * @property {String} Description
   */

  /**
   * @typedef CustomerRef
   * @property {String} value
   */

  /**
   *
   * @typedef Invoice
   * @property {LineItem[]} Line
   * @property {CustomerRef} CustomerRef
   * @property {String} DocNumber
   * @property {String} DueDate // yyyy-mm-dd
   * @property {Number} Deposit
   * @property {DepositToAccountRef} DepositToAccountRef
   */

  /**
   *
   * @param {Object} token
   * @param {String} realmId
   * @param {Invoice} invoiceData
   */

  static async createInvoice(token, realmId, invoiceData) {
    console.dir({ invoiceData }, { depth: null });
    const response = await QuickBooks.request({
      path: `/invoice`,
      method: 'POST',
      token,
      realmId,
      data: invoiceData,
    });

    console.log('Created invoice', response.data);
    return response.data.Invoice;
  }

  static async getInvoice(token, realmId, invoiceId) {
    const response = await QuickBooks.request({
      path: `/invoice/${invoiceId}`,
      method: 'GET',
      token,
      realmId,
    });

    return response.data.Invoice;
  }

  static async getAccounts(token, realmId, query) {
    const response = await QuickBooks.request({
      path: `/query`,
      method: 'GET',
      token,
      realmId,
      params: {
        query,
      },
    });

    return response.data.QueryResponse.Account;
  }

  static async getItem(token, realmId, id) {
    const response = await QuickBooks.request({
      path: `/item/${id}`,
      method: 'GET',
      token,
      realmId,
    });

    return response.data.Item;
  }

  /**
   *
   * @typedef SalesAccount
   * @property {String} Name
   * @property {String} AccountType
   * @property {String} AccountSubType
   */

  /**
   *
   * @param {String} token
   * @param {String} realmId
   * @param {SalesAccount} accountData
   */

  static async createSalesAccount(token, realmId, accountData) {
    const response = await QuickBooks.request({
      path: `/account`,
      method: 'POST',
      token,
      realmId,
      data: accountData,
    });

    return response.data.Account;
  }

  /**
   *
   * @typedef DepositToAccountRef
   * @property {String} value
   * @property {String} name
   * @returns
   */

  /**
   *
   * @param {Object} token
   * @param {String} realmId
   * @param {String} invoiceId
   * @param {String} syncToken
   * @param {Invoice} invoiceData
   */

  static async updateInvoice(
    token,
    realmId,
    invoiceId,
    syncToken,
    invoiceData
  ) {
    const response = await QuickBooks.request({
      path: `/invoice`,
      method: 'POST',
      token,
      realmId,
      data: {
        Id: invoiceId,
        sparse: true,
        SyncToken: syncToken,
        ...invoiceData,
      },
    });

    return response.data.Invoice;
  }

  static async getPayment(token, realmId, paymentId) {
    const response = await QuickBooks.request({
      path: `/payment/${paymentId}`,
      token,
      realmId,
    });

    return response.data.Payment;
  }

}

module.exports = QuickBooks;
