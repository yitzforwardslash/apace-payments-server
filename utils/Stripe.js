const fs = require('fs');
const path = require('path');
const { default: axios } = require('axios');
const tunnel = require('tunnel');
const BASE_URL = 'https://api.stripe.com/v1';

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

const formatFormData = (obj) =>
  Object.keys(obj)
    .map((key, index) =>
      typeof obj[key] === 'object'
        ? formatFormData(obj[key]).map(
            (item) =>
              `${key}[${item.split('=')[0]}]=${encodeURIComponent(
                item.split('=')[1]
              )}`
          )
        : `${key}=${encodeURIComponent(obj[key])}`
    )
    .reduce(
      (acc, item) =>
        typeof item === 'object' ? acc.concat(item) : acc.concat([item]),
      []
    );

class Stripe {
  static async request({ path, method, data, params }) {
    return axios({
      method,
      url: `${BASE_URL}${path}`,
      data: data ? formatFormData(data).join('&') : '',
      params,
      httpsAgent: tunnelingAgent,
      proxy: false,
      auth: {
        username: process.env.STRIPE_SECRET_KEY,
        password: '',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * @typedef Address
   * @property {String} city
   * @property {String} country
   * @property {String} line1
   * @property {String} line2
   * @property {String} state
   */

  /**
   * @typedef Customer
   * @property {String} name
   * @property {String} email
   * @property {String} phone
   * @property {Address} address
   */

  /**
   *
   * @param {Customer} customerData
   */
  static async createCustomer(customerData) {
    const customerResponse = await Stripe.request({
      method: 'POST',
      path: '/customers',
      data: customerData,
    });

    return customerResponse.data;
  }

  /**
   * @typedef Card
   * @property {String} number
   * @property {String} cvc
   * @property {Number} exp_month // M
   * @property {Number} exp_year // YYYY
   */

  /**
   * @param {String} customerId
   * @param {Card} cardData
   */

  static async createCard(customerId, cardData) {
    const tokenResponse = await Stripe.request({
      method: 'POST',
      path: '/tokens',
      data: {
        card: {
          number: cardData.number,
          exp_month: cardData.exp_month,
          exp_year: cardData.exp_year,
          cvc: cardData.cvc,
        },
      },
    });

    const cardResponse = await Stripe.request({
      method: 'POST',
      path: `/customers/${customerId}/sources`,
      data: {
        source: tokenResponse.data.id,
      },
    });

    return cardResponse.data;
  }

  /**
   * 
   * @param {String} customerId 
   * @param {String} cardId 
   * @returns {Boolean}
   */

  static async deleteCard(customerId, cardId) {
    const deleteResponse = await Stripe.request({
      method: "DELETE",
      path: `/customers/${customerId}/sources/${cardId}`,
    })

    return deleteResponse.data.deleted;
  }

  static async createCharge(customer,source, amount, description) {
    const chargeResponse = await Stripe.request({
      method: 'POST',
      path: '/charges',
      data: {
        amount: amount * 100, // amount in stripe is calcuated with cents
        source,
        customer,
        description,
        currency: 'USD',
      },
    });

    return chargeResponse.data;
  }
}

module.exports = Stripe;
