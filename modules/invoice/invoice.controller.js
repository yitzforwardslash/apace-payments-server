const express = require('express');
const {
  getVendorInvoices,
  generateInvoices,
  getInvoicesStats,
  getInvoiceById,
  payInvoice,
  payAllUnpaidInvoices,
  getVendorInvoicingSummary,
} = require('./invoice.service');
const { getInvoiceRefunds } = require('../vendor/refund/refund.service');
const parseFloatNumber = require('../../utils/ParseFloatNumber');
const logger = require('../../utils/Logger');
const {
  markRevenueSharesWithHasPaidInvoice,
} = require('../vendor/revenueShare/revenueShareService');

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getVendorInvoices = async (request, response) => {
  const { pageLength, cursor } = request.query;
  const { invoices, totalCount, totalPages, nextCursor } =
    await getVendorInvoices(
      request.vendorId,
      cursor ? Number.parseInt(cursor, 10) : null,
      pageLength ? Number.parseInt(pageLength, 10) : null
    );
  const invoicingSummary = await getVendorInvoicingSummary(request.vendorId);
  response.send({
    invoices,
    nextCursor,
    totalCount,
    totalPages,
    invoicingSummary,
  });
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.payInvoice = async (request, response) => {
  const invoiceId = parseInt(request.params.invoiceId);
  const invoice = await getInvoiceById(invoiceId, request.vendorId);
  const { paymentMethodId } = request.body;
  if (!invoice) {
    return response
      .status(400)
      .send({ success: false, message: 'Invalid invoice id' });
  }
  if (invoice.status === 'paid') {
    return response
      .status(400)
      .send({ success: false, message: 'Invoice is already paid' });
  }
  if (invoice.status === 'pending') {
    return response
      .status(400)
      .send({ success: false, message: 'Invoice payment is pending' });
  }
  try {
    const paid = await payInvoice(invoiceId, request.vendorId, paymentMethodId);
    if (!paid) {
      throw new Error('Failed to pay');
    }
    return response.send({ success: true, message: 'Paid successfully' });
  } catch (err) {
    console.log(err);
    return response
      .status(400)
      .send({ success: false, message: 'Failed to pay invoice' });
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.payAllInvoices = async (request, response) => {
  try {
    const paid = await payAllUnpaidInvoices(request.vendorId);
    if (!paid) {
      throw new Error('Failed to pay');
    }
    return response.send({ success: true, message: 'Paid successfully' });
  } catch (err) {
    return response
      .status(400)
      .send({ success: false, message: 'Failed to pay invoice' });
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.createVendorInvoice = async (request, response) => {
  const fromDate = new Date(request.body.fromDate);
  const toDate = new Date(request.body.toDate);
  try {
    await generateInvoices(request.vendorId, fromDate, toDate);
    response.send({
      status: true,
      message: 'This vendor invoice has been created successfully.',
    });
  } catch (error) {
    logger.error(error);
    response.status(500).send({
      success: true,
      message: 'Something went wrongg while trying to generate the invoice',
    });
  }
};

/**
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getInvoiceRefunds = async (request, response) => {
  const invoiceId = Number.parseInt(request.params.invoiceId);
  const refundsData = await getInvoiceRefunds(
    invoiceId,
    Number.parseInt(request.query.cursor) || null,
    Number.parseInt(request.query.pageLength) || null
  );
  const invoice = await getInvoiceById(invoiceId, request.vendorId);
  if (!invoice) {
    return response
      .status(404)
      .send({ success: false, message: "This invoice doesn't exist" });
  }
  response.send({ success: true, invoice, ...refundsData });
};

/**
 *
 * @param {express.Request} request
 * @param {express.Response} response
 */
module.exports.getVendorInvoiceStats = async (request, response) => {
  const totalPayments = await getInvoicesStats({ vendorId: request.vendorId });
  response.send({ totalDuePayments: parseFloatNumber(totalPayments) });
};
