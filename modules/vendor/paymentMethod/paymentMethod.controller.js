const vendorService = require('../vendor.service');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
const getVendorPaymentMethods = async (request, response) => {
  const paymentMethods = await vendorService.getVendorPaymentMethods(
    request.vendorId
  );

  return response.send({
    success: true,
    paymentMethods,
  });
};

module.exports = {
  getVendorPaymentMethods,
};
