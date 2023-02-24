const vendorsService = require("./vendors.service");
const dashboardService = require('../dashboard.service');
const {getInvoicesFilterByTypeAndDates} = require("../invoices/invoices.utils");
const { generateVendorAdminJWT } = require('./vendor.utils');


/* Vendors */
const getVendors = async (request, response, next) => {
    const {cursor, pageLength, page, status} = request.query;

    try {

        const data = await vendorsService.retrieveVendors(cursor, pageLength, page, status);

        response.status(200).send({
            success: true,
            data
        });

    } catch (error) {
        next(error);
    }
}

const getVendorsCount = async (request, response, next) => {
    try {

        const data = await vendorsService.retrieveVendorsCount();

        response.status(200).send({
            success: true,
            data
        });

    } catch (error) {
        next(error)
    }
}

const getVendorById = async (request, response, next) => {
    const {id} = request.params;

    try {
        const vendor = await vendorsService.retrieveVendorById(id);
        response.status(200).send({
            success: true,
            vendor
        });
    } catch (error) {
        next(error);
    }
}

/* Vendor Refunds */
const getVendorRefunds = async (request, response, next) => {
    const {id} = request.params;
    const {from, to, statuses, cursor, pageLength, page} = request.query;

    try {
        const data = await vendorsService.retrieveVendorRefunds(id, {from, to}, statuses, cursor, pageLength, page)
        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

const getFilteredVendorRefunds = async (request, response, next) => {
    const {id} = request.params;
    const {dates, statuses, cursor, pageLength, page} = request.body;

    try {
        const data = await vendorsService.retrieveVendorRefunds(id, dates, statuses, cursor, pageLength, page)
        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* Vendor Invoices */
const getVendorInvoices = async (request, response, next) => {
    const {id} = request.params;

    const {cursor, pageLength, page, from, to, type, order, orderBy} = request.query;

    const whereData = getInvoicesFilterByTypeAndDates(type, {from, to});

    whereData.vendorId = id;

    try {
        const data = await vendorsService.retrieveVendorInvoices(id, cursor, pageLength, page, whereData, {
            order,
            orderBy
        });

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

/* vendor invoices stats */
const getVendorInvoicesStats = async (request, response, next) => {
    const {id} = request.params;

    try {
        const data = await vendorsService.retrieveVendorInvoicesStats(id);

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

const updateVendorStatus = async (request, response, next) => {
    const {status} = request.body;
    const {id} = request.params;

    try {
        await vendorsService.alterVendorStatus(id, status, request.admin.id.toString())

        response.status(200).send({
            success: true,
            message: "Status updated"
        });
    } catch (error) {
        next(error);
    }
}

const updateVendorRefundListStatuses = async (request, response, next) => {
    const {refundListStatuses} = request.body;
    const {id} = request.params;

    try {
        await vendorsService.alterVendorRefundListStatuses(id, refundListStatuses, request.admin.id.toString())

        response.status(200).send({
            success: true,
            message: "refund list statuses updated"
        });
    } catch (error) {
        next(error)
    }
}

const archiveVendor = async (request, response, next) => {
    const {id} = request.params;

    try {
        await vendorsService.alterVendorStatus(id, 'ARCHIVED', request.admin.id.toString())

        response.status(200).send({
            success: true,
            message: 'Archived'
        });

    } catch (error) {
        response.statusMessage = error.message;
        next(error);
    }
}

const toggleRevenueShare = async (request, response, next) => {
    const {id} = request.params;
    const {revenueShareEnabled} = request.body;

    try {

        const data = await vendorsService.alterVendorRevenueShare(id, revenueShareEnabled, request.admin.id.toString());

        response.status(200).send({
            success: true,
            message: `Revenue share ${data.revenueShareEnabled ? 'Enabled' : 'Disabled'}`
        });
    } catch (error) {
        next(error);
    }
}

const toggleDNBApproval = async (request, response, next) => {
    const {id} = request.params;
    const {approvedByDNB} = request.body;

    try {

        const data = await vendorsService.alterVendorDNBApproval(id, approvedByDNB, request.admin.id.toString());

        response.status(200).send({
            success: true,
            message: `DNB approval ${data.approvedByDNB ? 'Enabled' : 'Disabled'}`
        });
    } catch (error) {
        next(error);
    }
}

const updateRevenueShare = async (request, response, next) => {
    const {id} = request.params;
    const {revenueSharePercentage} = request.body;

    try {
        await vendorsService.alterVendorRevenueSharePercentage(id, revenueSharePercentage, request.admin.id.toString());

        response.status(200).send({
            success: true,
            message: 'Revenue share percentage updated'
        });
    } catch (error) {
        next(error);
    }
}

const downloadVendorsCSV = async (request, response, next) => {
    const {from, to} = request.query;

    try {
        const url = await dashboardService.downloadEntityAsCSV({entity: 'vendors', from, to});

        return response.status(200).send({
            success: true,
            url
        })

    } catch (error) {
        next(error);
    }
}

const updateInvoicingCycleType = async (request, response, next) => {
    const {id} = request.params;
    const {invoicingCycleType} = request.body;

    try {
        await vendorsService.alterVendorInvoicingCycleType(id, invoicingCycleType, request.admin.id.toString());

        response.status(200).send({
            success: true,
            message: 'Invoicing cycle type updated'
        });
    } catch (error) {
        next(error);
    }
}

const createAdminVendorTempToken = async (request, response, next) => {
    const { vendorId } = request.body;
    const adminId = request.admin.id;

    try {
        const adminVendorToken = await generateVendorAdminJWT(vendorId, adminId);
        response.send({
            adminVendorToken,
            success: true
        })
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getVendors,
    getVendorsCount,
    getVendorById,
    getVendorRefunds,
    getVendorInvoices,
    getVendorInvoicesStats,
    updateVendorStatus,
    updateVendorRefundListStatuses,
    archiveVendor,
    updateRevenueShare,
    getFilteredVendorRefunds,
    toggleRevenueShare,
    downloadVendorsCSV,
    toggleDNBApproval,
    createAdminVendorTempToken,
    updateInvoicingCycleType,
}