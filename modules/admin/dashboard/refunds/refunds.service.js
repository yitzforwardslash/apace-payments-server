const async = require('async');
const fs = require('fs');
const path = require('path');
const storageService = require('../../../storage/storage.service');
const {refund: Refund} = require("../../../../prisma/prismaClient");
const {NotFoundError} = require("../../../../utils/CustomError");
const {getDateRangeFilter, preparePagination} = require("../../admin.utils");
const {calculatenNextCursor} = require("../../../../utils/Pagination");
const {logError, logInfo} = require("../../logs/logs.service");
const {getFieldValue} = require('../../../../utils/getFieldValue');


const retrieveRefundById = async (id) => {
    const refund = await Refund.findUnique({
        where: {id},
        include: {
            vendor: {
                select: {
                    id: true,
                    ownerFirstName: true,
                    ownerLastName: true,
                    email: true
                }
            },
            refundItems: true,
            customer: {
                select: {
                    id: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                }
            },
            customerCard: true
        }
    });

    if (!refund) {
        throw new NotFoundError('refunds');
    }

    return refund;
}

const retrieveRefunds = async (cursor, pageLength, page, dates) => {
    let whereData = getDateRangeFilter(dates, 'refundDate');

    const totalCount = await Refund.count({
        where: whereData
    });

    const paginationData = preparePagination(cursor, pageLength, totalCount, page);

    const refunds = await Refund.findMany({
        ...paginationData.pagination,
        where: whereData,
        select: {
            id: true,
            refundNumber: true,
            amount: true,
            refundDepositedAt: true,
            refundDate: true,
            status: true,
            vendor: {
                select: {
                    id: true,
                    ownerFirstName: true,
                    ownerLastName: true,
                    email: true
                }
            },
            customer: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
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

const retrieveRefundsTotalAmount = async (dates, vendorId = null, statuses = []) => {
    let whereData = getDateRangeFilter(dates, 'refundDate');

    statuses.length > 0 ? whereData.status = {in: statuses} : '';

    const refundsTotalAmount = await Refund.aggregate({
        where: whereData,
        _sum: {
            amount: true
        }
    });

    return refundsTotalAmount._sum.amount || 0;
}

const retrieveRefundsTotalCount = async (dates) => {
    let whereData = getDateRangeFilter(dates, 'refundDate');

    const refunds = await Refund.findMany({
        select: {
            id: true
        },
        where: whereData
    });

    if (!refunds) {
        throw new NotFoundError('refunds');
    }

    return refunds.length;
}

const updateRefund = async (id, data, updatedBy) => {
    const refund = await Refund.findUnique({where: {id}});

    try {
        const updatedRefund = await Refund.update({
            where: {id},
            data
        });

        await logInfo({
            action: 'update',
            description: 'Cancel Refund',
            model: 'refund',
            actionOn: id.toString(),
            updatedBy,
            updatedFields: ['status'],
            oldValues: {status: refund.status},
            newValues: {status: updatedRefund.status},
        })

        return updatedRefund;
    } catch (error) {
        await logError({
            action: 'update',
            model: 'refund',
            description: JSON.stringify(error),
            actionOn: id.toString(),
            updatedBy
        });
        throw new Error('Error while canceling refund.')
    }
}

const downloadRefundsAsCSV = async ({from, to}) => {
    if (!to) {
        to = new Date();
    }
    let whereData = getDateRangeFilter({from, to}, 'createdAt');

    const refundsCount = await Refund.count({where: whereData});

    const fileName = `refunds_${Date.now()}.csv`;
    const filePath = path.join(__dirname, fileName);
    const fileStream = fs.createWriteStream(filePath);

    const fields = [
        'id',
        'refundNumber',
        'amount',
        'refundDate',
        'expirationDate',
        'expired',
        'disabled',
        'isPartialRefund',
        'orderId',
        'orderUrl',
        'productIds',
        'orderDate',
        'cardLastFour',
        'cardType',
        'cardLastFourVerified',
        'status',
        'agreementDate',
        'refundLink',
        'customerEmail',
        'customerFName',
        'customerLName',
        'emailSent',
        'emailSentAt',
        'emailOpenedAt',
        'linkClickedAt',
        'refundDepositedAt',
        'lastStep',
        'createdAt'
    ];
    // write file header
    await new Promise((resolve) => fileStream.write(
        [
            'vendor',
            ...fields
        ].join(',') + '\n',
        resolve
    ));

    const extractInfoFuncArray = [];
    const perCycle = 1;

    for (let i = 0; i < refundsCount; i += perCycle) {
        extractInfoFuncArray.push(async () => {
            try {
                const refunds = await Refund.findMany({
                    where: whereData,
                    take: perCycle,
                    skip: i,
                    orderBy: {createdAt: 'desc'},
                    include: {vendor: {select: {commercialName: true}}, transaction: true}
                });
                const refundLines = [];

                refunds.forEach(refund => {
                    const item = [];
                    fields.forEach((key) => {
                        item.push(getFieldValue(refund, key));
                    });
                    item.unshift(refund.vendor.commercialName);
                    refundLines.push(item.join(','))
                });

                await new Promise((resolve) => fileStream.write(
                    refundLines.join('\n'),
                    resolve
                ));
            } catch (err) {
                console.log(err);
            }
            await new Promise((resolve) => fileStream.write(
                '\n',
                resolve
            ));
        })
    }

    await new Promise((resolve, reject) => {
        async.parallelLimit(extractInfoFuncArray, 1, (err) => {
            if (err) return reject(err);
            return resolve();
        })
    })

    const fileKey = await storageService.uploadFile(filePath, fileName);
    const url = `${process.env.API_URL}storage${fileKey}`;

    fs.unlink(filePath, () => {
    });

    return url;
}

module.exports = {
    retrieveRefundsTotalAmount,
    retrieveRefundsTotalCount,
    retrieveRefundById,
    retrieveRefunds,
    updateRefund,
    downloadRefundsAsCSV
}