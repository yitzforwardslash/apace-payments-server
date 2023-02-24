const refundsService = require("./refunds.service");
const dashboardService = require('../dashboard.service');


const getRefundById = async (request, response, next) => {
  const { id } = request.params;

  try {
    const refund = await refundsService.retrieveRefundById(id);

    response.status(200).send({
      success: true,
      refund,
    });
  } catch (error) {
    next(error);
  }
};

const getAllRefunds = async (request, response, next) => {
  const { cursor, pageLength, page, from, to } = request.query;

  try {
    const data = await refundsService.retrieveRefunds(
      cursor,
      pageLength,
      page,
      { from, to }
    );

    response.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getRefundsTotalAmount = async (request, response, next) => {
  const { from, to } = request.query;

  try {
    const refundsTotalAmount = await refundsService.retrieveRefundsTotalAmount({
      from,
      to,
    });

    response.status(200).send({
      success: true,
      refundsTotalAmount,
    });
  } catch (error) {
    next(error);
  }
};

const getRefundsTotalCount = async (request, response, next) => {
  const { from, to } = request.query;

  try {
    const refundsTotalCount = await refundsService.retrieveRefundsTotalCount({
      from,
      to,
    });

    response.status(200).send({
      success: true,
      refundsTotalCount,
    });
  } catch (error) {
    next(error);
  }
};

const cancelRefund = async (request, response, next) => {
    const { id } = request.params;

    try {
        const canceledRefund = await refundsService.updateRefund(id, {status: 'canceled'}, request.admin.id.toString());
        response.status(200).send({
            success: true,
            canceledRefund
        });

    } catch (error) {
        next(error);
    }

}

const downloadRefundsAsCSV = async (request, response, next) => {
    const {from, to} = request.query;

    try {
        const url = await dashboardService.downloadEntityAsCSV({ entity: 'refunds', from, to});
        return response.send({
            success:true,
            url
        })
    } catch(error) {
        next(error);
    }
}


module.exports = {
    getRefundsTotalAmount,
    getRefundsTotalCount,
    getRefundById,
    getAllRefunds,
    cancelRefund,
    downloadRefundsAsCSV
}