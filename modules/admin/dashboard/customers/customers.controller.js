const customersService = require("./customers.service");
const dashboardService = require('../dashboard.service');
const {isNumeric} = require("validator");

const getAllCustomers = async (request, response, next) => {
    const { cursor, pageLength, page } = request.query;

    try {
        const data = await customersService.retrieveCustomers(cursor, pageLength, page);

        response.status(200).send({
            success: true,
            data
        });

    } catch (error) {
        next(error);
    }
}

const getCustomerRefunds = async (request, response, next) => {
    const { cursor, pageLength, from, to, page } = request.query;
    const { id } = request.params;

    try {
        const data = await customersService.retrieveCustomerRefunds(id, {from, to}, cursor, pageLength, page);

        response.status(200).send({
            success: true,
            data
        });

    } catch (error) {
        next(error);
    }
}

const getCustomerById = async (request, response, next) => {
    const { id } = request.params;

    try {
        const data = await customersService.retrieveCustomerById(id);

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

const updateCustomerStatus = async (request, response, next) => {
    let { id } = request.params;
    id = isNumeric(id) ? parseInt(id) : id ;
    const { status } = request.body;

    try {
        const data = await customersService.updateCustomer(id, { status }, request.admin.id.toString());

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

const downloadCustomersAsCSV = async (request, response, next) => {
    const { from, to } = request.query;

    try {
        const url = await dashboardService.downloadEntityAsCSV({ entity: 'customers', from, to });

        return response.status(200).send({
            success: true,
            url
        });
    } catch(error) {
        next(error);
    }
}

module.exports = {
    getAllCustomers,
    getCustomerRefunds,
    getCustomerById,
    updateCustomerStatus,
    downloadCustomersAsCSV
}