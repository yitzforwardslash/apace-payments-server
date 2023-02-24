const payoutService = require("./payout.service");


const getVendorPayouts = async (request, response, next) => {
    const {vendorId} = request;
    const {cursor, pageLength, page} = request.query;

    try {
        const data = await payoutService.getVendorPayouts(vendorId, cursor, pageLength, page);

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

const getVendorPayoutsTotalAmount = async (request, response, next) => {
    const {vendorId} = request;

    try {
        const data = await payoutService.getVendorPayoutsTotalAmount(vendorId);

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

const receivePayment = async (request, response, next) => {
    const {vendorId} = request;
    const { amount, cardId, bankAccountId } = request.body;

    try {
        const data = await payoutService.issuePaymentToVendor(vendorId, { amount, bankAccountId, cardId});

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getVendorPayouts,
    getVendorPayoutsTotalAmount,
    receivePayment
}