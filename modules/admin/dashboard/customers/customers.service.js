const { customer: Customer, refund: Refund} = require("../../../../prisma/prismaClient");
const { preparePagination, getDateRangeFilter} = require("../../admin.utils");
const {calculatenNextCursor} = require("../../../../utils/Pagination");
const {NotFoundError} = require("../../../../utils/CustomError");
const {isNumeric} = require("validator");
const {logError, logInfo} = require("../../logs/logs.service");


const retrieveCustomers = async (cursor, pageLength, page) => {

    const totalCount = await Customer.count();

    const paginationData = preparePagination(cursor, pageLength, totalCount, page);

    const customers = await Customer.findMany({
        ...paginationData.pagination
    });

    return {
        customers,
        totalCount,
        totalPages: paginationData.totalPages,
        nextCursor: calculatenNextCursor(customers),
        currentPage: Number.parseInt(page)
    }

}

const retrieveCustomerRefunds = async (id, dates, cursor, pageLength, page) => {
    let whereData = getDateRangeFilter(dates, 'createdAt');

    whereData.customerId = isNumeric(id) ? parseInt(id) : id;

    const totalCount = await Refund.count({where: whereData});

    const paginationData = preparePagination(cursor, pageLength, totalCount, page);

    const refunds = await Refund.findMany({
        ...paginationData.pagination,
        where: whereData,
        select: {
            id: true,
            amount: true,
            refundNumber: true,
            refundDate: true,
            refundDepositedAt: true,
            productIds: true,
            status: true,
            createdAt: true,
            customer: {
                select: {
                    id: true,
                    firstName:true,
                    lastName:true,
                    email:true,
                }
            },
            vendor: {
                select: {
                    id: true,
                    ownerFirstName: true,
                    ownerLastName: true,
                    email: true,
                }
            }

        }
    });

    return {
        refunds,
        totalCount,
        totalPages: paginationData.totalPages,
        nextCursor: calculatenNextCursor(refunds),
        currentPage: Number.parseInt(page)
    }
}

const retrieveCustomerById = async (id) => {
    const customer = await Customer.findUnique({
        where: { id: isNumeric(id) ? parseInt(id) : id }
    });

    if(!customer){
        throw new NotFoundError('customer');
    }

    return customer;
}

const updateCustomer = async ( id, { status }, updatedBy) => {
    const customer = await Customer.findUnique({ where: { id }});

    try{
        const updatedCustomer = await Customer.update({
            where: { id },
            data:{
                status
            }
        });

        await logInfo({
            action: 'update',
            model: 'customer',
            actionOn: id.toString(),
            updatedBy,
            description: 'Disable Customer',
            updatedFields: ['status'],
            oldValues: { status: customer.status },
            newValues: { status: updatedCustomer.status}
        });

        return updatedCustomer;
    } catch (error) {
        await logError( { action: 'update', description: JSON.stringify(error), model:'customer', actionOn: id.toString(), updatedBy});
        throw new Error('Error while updating customer.')
    }
}

module.exports = {
    retrieveCustomers,
    retrieveCustomerRefunds,
    retrieveCustomerById,
    updateCustomer
}