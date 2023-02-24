const invoicesService = require('./invoices.service');
const dashboardService = require('../dashboard.service');
const { isNumeric } = require('../dashboard.utils');
const {
  getDueInvoicesWhereFilter,
  getOverdueInvoicesWhereFilter,
  getDueTodayInvoicesWhereFilter,
  getInvoicesFilterByTypeAndDates,
} = require('./invoices.utils');

const getOverdueInvoicesTotalAmount = async (request, response, next) => {
  try {
    const overdueInvoicesTotalAmount =
      await invoicesService.retrieveOverdueInvoicesTotalAmount();

    response.status(200).send({
      success: true,
      overdueInvoicesTotalAmount,
    });
  } catch (error) {
    next(error);
  }
};

const getDueInvoicesTotalAmount = async (request, response, next) => {
  try {
    const dueInvoicesTotalAmount =
      await invoicesService.retrieveDueInvoicesTotalAmount();

    response.status(200).send({
      success: true,
      dueInvoicesTotalAmount,
    });
  } catch (error) {
    next(error);
  }
};

const getPaidInvoicesTotalAmount = async (request, response, next) => {
  const { from, to } = request.query;

  try {
    const paidInvoicesTotalAmount =
      await invoicesService.retrievePaidInvoicesTotalAmount({ from, to });

    response.status(200).send({
      success: true,
      paidInvoicesTotalAmount,
    });
  } catch (error) {
    next(error);
  }
};

/* Invoices lists */
const getAllInvoices = async (request, response, next) => {
  const { cursor, pageLength, page, from, to, type } = request.query;

  const whereData = getInvoicesFilterByTypeAndDates(type, { from, to });

  try {
    const data = await invoicesService.retrieveInvoices(
      cursor,
      pageLength,
      page,
      whereData
    );

    response.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getInvoiceById = async (request, response, next) => {
  let { id } = request.params;

  id = isNumeric(id) ? parseInt(id) : id;

  try {
    const invoice = await invoicesService.retrieveInvoiceById(id);

    response.status(200).send({
      success: true,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

/* Filtered invoices  */
const getOverdueInvoices = async (request, response, next) => {
  const { cursor, pageLength, page } = request.query;

  try {
    const whereData = getOverdueInvoicesWhereFilter();

    const data = await invoicesService.retrieveInvoices(
      cursor,
      pageLength,
      page,
      whereData
    );

    response.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getDueInvoices = async (request, response, next) => {
  const { cursor, pageLength, page } = request.query;

  try {
    const whereData = getDueInvoicesWhereFilter();

    const data = await invoicesService.retrieveInvoices(
      cursor,
      pageLength,
      page,
      whereData
    );

    response.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getDueTodayInvoices = async (request, response, next) => {
  const { cursor, pageLength, page } = request.query;

  try {
    const whereData = getDueTodayInvoicesWhereFilter();

    const data = await invoicesService.retrieveInvoices(
      cursor,
      pageLength,
      page,
      whereData
    );

    response.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/* Invoice actions */
const markInvoiceAsPaid = async (request, response, next) => {
  let { id } = request.params;
  let { paymentMethod, referenceAndNotes } = request.body;

  id = isNumeric(id) ? parseInt(id) : id;

  try {
    const updatedInvoice = await invoicesService.markInvoiceAsPaid(
      id,
      {
        paymentMethod,
        referenceAndNotes,
      },
      request.admin.id.toString()
    );

    response.status(200).send({
      success: true,
      updatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};

const downloadInvoicesAsCSV = async (request, response, next) => {
  const { from, to } = request.query;

  try {
    const url = await dashboardService.downloadEntityAsCSV({
      entity: 'invoices',
      from,
      to,
    });

    return response.status(200).send({
      success: true,
      url,
    });
  } catch (error) {
    next(error);
  }
};

const generateInvoicesForVendors = async (request, response, next) => {
  const { dueDate, vendorIds } = request.body;
  try {
    await invoicesService.generateInvoicesForVendors({ dueDate, vendorIds });
    return response.status(200).send({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDueInvoicesTotalAmount,
  getOverdueInvoicesTotalAmount,
  getPaidInvoicesTotalAmount,
  getAllInvoices,
  getInvoiceById,
  getOverdueInvoices,
  getDueInvoices,
  markInvoiceAsPaid,
  getDueTodayInvoices,
  downloadInvoicesAsCSV,
  generateInvoicesForVendors,
};
