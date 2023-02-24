const { getVendor } = require('../vendor.service');
const agreementService = require('./agreement.service');

const issueVendorAgreement = async (request, response, next) => {
  const vendor = await getVendor({ id: request.vendorId });

  const requiredFields = [
    'commercialName',
    'entity',
    'owner_lastname',
    'owner_firstname',
    'state',
    'street_1',
    'city',
    'zip',
  ];

  let missingField = '';
  requiredFields.forEach((field) => {
    if (!vendor[field]) {
      missingField = field;
    }
  });
  if (missingField) {
    return response.status(400).send({
      success: false,
      message: `Field ${missingField} is not set on vendor`,
    });
  }

  try {
    const htmlAgreement = agreementService.issueAgreement({
      commercialName: vendor.commercialName,
      entity: vendor.entity,
      ownerFirstName: vendor.owner_firstname,
      ownerLastName: vendor.owner_lastname,
      state: vendor.state,
      address: vendor.street_1,
      city: vendor.city,
      zip: vendor.zip,
    });

    response
      .setHeader('Content-Type', 'text/html')
      .status(200)
      .send(htmlAgreement);
  } catch (error) {
    next(error);
  }
};

const downloadUnsignedAgreement = async (request, response, next) => {
  const vendor = await getVendor({ id: request.vendorId });

  const requiredFields = [
    'commercialName',
    'entity',
    'owner_lastname',
    'owner_firstname',
    'state',
    'street_1',
    'city',
    'zip',
  ];

  let missingField = '';
  requiredFields.forEach((field) => {
    if (!vendor[field]) {
      missingField = field;
    }
  });
  if (missingField) {
    return response.status(400).send({
      success: false,
      message: `Field ${missingField} is not set on vendor`,
    });
  }

  try {
    const url = await agreementService.downloadAgreement({
      commercialName: vendor.commercialName,
      entity: vendor.entity,
      ownerFirstName: vendor.owner_firstname,
      ownerLastName: vendor.owner_lastname,
      state: vendor.state,
      address: vendor.street_1,
      city: vendor.city,
      zip: vendor.zip,
    });

    return response.status(200).send({
      success: true,
      url,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  issueVendorAgreement,
  downloadUnsignedAgreement,
};
