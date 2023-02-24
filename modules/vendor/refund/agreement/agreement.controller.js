const agreementService = require('./agreement.service');

const issueRefundAgreement = async (request, response, next) => {
  try {
    const htmlAgreement = await agreementService.issueAgreement(request.refundId);

    response
      .setHeader('Content-Type', 'text/html')
      .status(200)
      .send(htmlAgreement);
  } catch (error) {
    next(error);
  }
};

const downloadUnsignedAgreement = async (request, response, next) => {

  try {
    const url = await agreementService.getAgreementURL(request.refundId, null, false);

    return response.status(200).send({
      success: true,
      url,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  issueRefundAgreement,
  downloadUnsignedAgreement,
};
