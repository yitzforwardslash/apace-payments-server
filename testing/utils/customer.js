const {
  createNewCustomer,
} = require('../../modules/customer/customer.service');
const {
  generateCustomerLoginToken,
  addToDwolla,
} = require('../../modules/customer/customer.utils');
const { createRefund } = require('./refund');
const { createVendor } = require('./vendor');
const vendor = createVendor();
const faker = require('faker');
const uniquePhone = require('random-mobile');
/**
 * @param {String} vendorId
 * @param {String} phone
 * @param {String} email
 * @param {Function} addDwolla
 * @returns {Promise<{customerId: number;firstName: string;lastName: string;phone: string;email: string;}>}
 */
module.exports.createCustomer = async (vendorId, phone, email, addDwolla) => {
  if (!vendorId) {
    vendorId = (await vendor).id;
  }
  const { id: refundId } = await createRefund(vendorId);
  const customerData = {
    firstName: 's',
    lastName: 's',
    phone: phone || uniquePhone(),
    email: email || faker.internet.email().toLowerCase(),
    refundId,
  };
  if (addDwolla) {
    await addToDwolla({
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
    });
  }
  return {
    customerId: await createNewCustomer(customerData, refundId),
    ...customerData,
  };
};

module.exports.getCustomerToken = async (identifier, refundId) => {
  const vendorId = (await vendor).id;
  if (!refundId) {
    refundId = (await createRefund(vendorId)).id;
  }
  return generateCustomerLoginToken(identifier, '1.1.1.1', refundId, 14 * 60);
};
