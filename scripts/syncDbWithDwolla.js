const Dwolla = require('../utils/Dwolla');
const {
  vendor: Vendor,
  vendorPaymentMethod: VendorPaymentMethod,
} = require('../prisma/prismaClient');
const logger = require('../utils/Logger');

const sync = async () => {
  const eachVendorPaymentMethods = await findAllVendorsPaymentMethods();
  logger.info(eachVendorPaymentMethods);

  Object.entries(eachVendorPaymentMethods).map(
    async ([vendorId, paymentMethods]) => {
      logger.info('here');
      const vendorPromises = [];
      if (paymentMethods.activeFundingSources.length !== 0) {
        vendorPromises.push(
          Vendor.update({
            where: { id: vendorId },
            data: {
              paymentMethods: {
                createMany: {
                  data: paymentMethods.activeFundingSources.map(
                    (fundingSource) => ({
                      type: fundingSource.type,
                      name: fundingSource.name,
                      fundingSource: fundingSource._links.self.href,
                    })
                  ),
                },
              },
            },
          })
        );
      }
      if (paymentMethods.removedFundingSources.length !== 0) {
        vendorPromises.push(
          VendorPaymentMethod.createMany({
            data: paymentMethods.removedFundingSources.map((fundingSource) => ({
              type: fundingSource.type,
              name: fundingSource.name,
              fundingSource: fundingSource._links.self.href,
              disconnectedFromVenod: vendorId,
              disconnectedAt: new Date(),
            })),
          })
        );
      }
      await Promise.all(vendorPromises);
    }
  );
};

/**
 * @returns {Array<Array>}
 */
const findAllVendorsPaymentMethods = async () => {
  const allVendors = await Vendor.findMany();
  const vendorToPaymentMethods = {};

  await Promise.all(
    allVendors.map(async (vendor) => {
      const [activeFundingSources, removedFundingSources] = await Promise.all([
        Dwolla.getDwollaCustomerFundingSources(vendor.email),
        Dwolla.getDwollaCustomerDeletedFundingSources(vendor.email),
      ]);

      if (
        activeFundingSources.length === 0 &&
        removedFundingSources.length === 0
      ) {
        return;
      }

      vendorToPaymentMethods[vendor.id] = {
        activeFundingSources,
        removedFundingSources,
      };
    })
  );
  return vendorToPaymentMethods;
};
module.exports = sync;
