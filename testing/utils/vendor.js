const {
  addNewVendor,
  addVendorTokens,
} = require('../../modules/vendor/vendor.service');
const faker = require('faker');
const { generateVendorJWT } = require('../../modules/vendor/vendor.utils');
const uniquePhone = require('random-mobile');

module.exports.getFakeData = () => {
  return {
    email: faker.internet.email(),
    commercialName: faker.company.companyName(),
    phone: uniquePhone(),
    ownerFirstName: faker.name.findName(),
    ownerLastName: faker.name.lastName(),
  };
};

module.exports.createVendor = async () => {
  return addNewVendor({
    ...this.getFakeData(),
    password: '123456',
    disabled: false,
  });
};

/**
 * @typedef {Object} Vendor
 * @property {String} email
 * @property {String} commercialName
 * @property {String} password
 * @property {String} phone
 * @property {String} ownerFirstName
 * @property {String} ownerLastName
 * @property {Boolean} disabled
 * @property {Number} id
 */

/**
 *
 * @returns {Promise<Vendor & {token: string}>}
 */
module.exports.createVendorAndToken = async () => {
  const vendor = await this.createVendor();
  const token = generateVendorJWT(vendor.id);
  return { ...vendor, token };
};

module.exports.createApiKey = async (vendorId) => {
  return addVendorTokens(vendorId, 'test');
};
