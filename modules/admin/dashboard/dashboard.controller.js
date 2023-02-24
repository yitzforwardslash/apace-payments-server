const dashboardService = require("./dashboard.service");
const refundsService = require("./refunds/refunds.service");
const invoicesService = require("./invoices/invoices.service");
const moment = require("moment");


const getAvailableBalance = async (request, response, next) => {
    try {
        const balance = await dashboardService.retrieveBalance()

        response.status(200).send({
            success: true,
            balance
        });

    } catch (error) {
        next(error);
    }
}

const getStats = async (request, response, next) => {
    try {
        const balance = await dashboardService.retrieveBalance();
        const dueToday = await dashboardService.getDueTodayInvoiceAmount();
        const overdue = await dashboardService.getOverdueInvoiceAmount();

        return response.status(200).send({
            success: true,
            balance,
            dueToday,
            overdue
        });
    } catch (error) {
        next(error)
    }
}

const getFunds = async (request, response, next) => {
    const {from, to} = request.query;
    const days = moment(to).diff(moment(from), 'days');

    /* All data is filtered by the date range specified */
    try {

        const refundsTotalAmount = await refundsService.retrieveRefundsTotalAmount({from, to});
        const refundsTotalCount = await refundsService.retrieveRefundsTotalCount({from, to});

        const refundsCountPerDay = (refundsTotalCount / days).toFixed(2);
        const averageRefundsAmount = (refundsTotalAmount / days).toFixed(2);
        const refundsAmountPerDay = ((refundsCountPerDay * averageRefundsAmount) / days).toFixed(2);

        const paidInvoicesTotalAmount = await invoicesService.retrievePaidInvoicesTotalAmount({from, to});

        return response.status(200).send({
            success: true,
            refundsTotalAmount,
            refundsTotalCount,
            refundsCountPerDay,
            refundsAmountPerDay,
            averageRefundsAmount,
            paidInvoicesTotalAmount
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAvailableBalance,
    getStats,
    getFunds
}