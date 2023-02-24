const Dwolla = require('../utils/Dwolla');
const { customer } = require('../prisma/prismaClient');
module.exports = async () => {
  let phone = Date.now();
  const emailSet = new Set();
  const toBeAddedCustomersArray = [];
  const {
    body: {
      _embedded: { customers: dwollaCustomers },
    },
  } = await Dwolla.client.get('customers?limit=200');
  const emails = dwollaCustomers.map((customer) => customer.email);
  const existingCustomers = await customer.findMany({
    where: { email: { in: emails } },
  });
  const toBeAddedCustomers = dwollaCustomers
    .filter(
      (dwollaCustomer) =>
        !existingCustomers.find((customer) => customer === dwollaCustomer.email)
    )
    .forEach((dwollaCustomer) => {
      if (emailSet.has(dwollaCustomer.email)) {
        return;
      }
      phone += 1;
      toBeAddedCustomersArray.push({
        email: dwollaCustomer.email,
        firstName: dwollaCustomer.firstName,
        lastName: dwollaCustomer.lastName,
        phone: phone.toString(),
      });
      emailSet.add(dwollaCustomer.email);
    });
  await customer.createMany({ data: toBeAddedCustomersArray });
};
