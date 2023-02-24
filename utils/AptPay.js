const { default: axios } = require('axios');
const crypto = require('crypto');
const tunnel = require('tunnel');
const fs = require('fs');
const path = require('path');

const APTPAY_API_KEY = process.env.APTPAY_API_KEY;
const APTPAY_APTOKEN = process.env.APTPAY_APTOKEN;
const APTPAY_SECRET = process.env.APTPAY_SECRET;

const BASE_URL = process.env.APTPAY_BASE_URL;

const CERT_PATH =
  process.env.NODE_ENV === 'production'
    ? '../certs/VGS_LIVE.pem'
    : '../certs/VGS_CERT.pem';

const tunnelingAgent = tunnel.httpsOverHttp({
  ca: [fs.readFileSync(path.join(__dirname, CERT_PATH))],
  proxy: {
    host: process.env.VGS_HOST,
    port: process.env.VGS_PORT,
    proxyAuth: `${process.env.VGS_USERNAME}:${process.env.VGS_PASSWORD}`,
  },
});

class AptPay {
  static signHmacSha512(str) {
    let hmac = crypto.createHmac('sha512', APTPAY_SECRET);
    let signed = hmac.update(Buffer.from(str, 'utf-8')).digest('hex');
    return signed;
  }

  static async request({ path, method, data, params }) {
    return axios({
      method,
      url: `${BASE_URL}${path}`,
      data: data,
      params,
      httpsAgent: tunnelingAgent,
      proxy: false,
      headers: {
        'Content-Type': 'application/json',
        AptPayApiKey: APTPAY_API_KEY,
        aptoken: APTPAY_APTOKEN,
        'body-hash': AptPay.signHmacSha512(data ? JSON.stringify(data) : ''),
      },
    });
  }

  /**
   * @typedef {Object} Payee
   * @property {Boolean}  individual
   * @property {String} clientId
   * @property {String} name
   * @property {String} first_name
   * @property {String} last_name
   * @property {String} street
   * @property {String} street_line_2
   * @property {String} city
   * @property {String} zip
   * @property {String} province
   * @property {String} country // 2 degits code
   * @property {String} countryOfRegistration // 2 degits code
   * @property {String} provinceOfRegistration // 2 degits code
   * @property {String} businessTaxId
   * @property {String} dateOfBirth // YYYY-MM-DD
   * @property {String} dbaName
   * @property {String} url
   * @property {String} typeOfBusiness
   * @property {String} dateOfIncorporation // YYYY-MM-DD
   * @property {String} phone //  +15555551234
   * @property {String} email //
   * @property {String} nationalIdentityNumber // ssn 000000000
   * @property {String} clientId // Database id
   *
   */

  /**
   *
   * @param {Payee} payee
   *
   */
  static async createPayee(payee) {
    const response = await AptPay.request({
      path: '/payees/add',
      method: 'post',
      data: payee,
    });

    return {
      id: response.data.id,
      status: response.data.status,
    };
  }

  /**
   * @param {String} id
   *
   */
  static async getPayee(id) {
    const response = await AptPay.request({
      path: `/payees/${id}`,
      method: 'get',
    });

    return response.data;
  }

  /**
   * @param {String} id
   * @param {Payee} payee
   *
   */
  static async updatePayee(id, payee) {
    const response = await AptPay.request({
      path: `/payees/${id}`,
      method: 'put',
      data: payee,
    });

    return {
      id: response.data.id,
      status: response.data.status,
    };
  }

  /**
   * @typedef {Object} Disbursement
   * @property {Number} amount
   * @property {String} currency
   * @property {String} disbursementNumber // card number
   * @property {String} expirationDate // YYYY-MM
   * @property {String} payeeId
   * @property {String} referenceId
   * @property {String} descriptor
   * @property {String} custom1
   * @property {String} custom2
   * @property {String} custom3
   * @property {String} custom4
   */

  /**
   * @typedef {Object} Card
   * @property {Number} amount
   * @property {String} currency
   * @property {String} disbursementNumber // card number
   * @property {String} expirationDate // YYYY-MM
   */

  /**
   * @param {Card} data
   */
  static async validateCard(data) {
    const response = await AptPay.request({
      path: '/account/check',
      method: 'post',
      data,
    });

    const {
      sending,
      receiving,
      network,
      funds_availability,
      type,
      country,
      currency,
      reason_code,
    } = response.data;

    return {
      sending,
      receiving,
      network,
      funds_availability,
      type,
      country,
      currency,
      reason_code,
    };
  }

  /**
   * @param {Disbursement} data
   */

  static async createCardDisbursement(data) {
    const response = await AptPay.request({
      path: '/disbursements/add',
      method: 'post',
      data: {
        ...data,
        transactionType: 'CARD',
      },
    });

    return {
      id: response.data.id,
      status: response.data.status,
    };
  }

  /**
   * @typedef {Object} BankDisbursement
   * @property {Number} identityId
   * @property {Number} amount
   * @property {String} currency
   * @property {String} descriptor
   * @property {String} referenceId
   * @property {String} routingNumber
   * @property {String} accountNumber
   * @property {String} custom1
   */

  /**
   *
   * @param {BankDisbursement} data
   */
  static async createBankAccountACHDebit(data) {
    const response = await AptPay.request({
      path: '/ach-debit/create',
      method: 'post',
      data,
    });

    return {
      id: response.data.id,
      status: response.data.status,
    };
  }

  static async getDisbursmentStatus(id) {
    const response = await AptPay.request({
      path: `/disbursements/${id}`,
      method: 'get',
    });
    console.log({status: response.data})

    return response.data.status;
  }

  static async getAvailableBalance() {
    const response = await AptPay.request({
      path: '/balance',
      method: 'get',
    });

    return response.data.balance;
  }
}

module.exports = AptPay;
