const {
  getRefundAgreementAsHTML,
  getRefundAgreementAsText,
} = require('./agreement.utils');
const {
  calculateRefund,
  calculateFeePercentage,
} = require('../../refund/refund.utils');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const htmlPdf = require('html-pdf');
const storageService = require('../../../storage/storage.service');
const { refund: Refund } = require('../../../../prisma/prismaClient');

const getRefundData = async (refundId) => {
  const refund = await Refund.findUnique({
    where: { id: refundId },
    include: { refundItems: true, vendor: true, customer: true },
  });
  const refundAmount = await calculateRefund(refund.vendorId, refund.amount);
  const feePercentage = await calculateFeePercentage(
    refund.vendorId,
    refund.amount
  );

  return {
    refundItems: refund.refundItems.map((item) => item.displayName),
    refundAmount,
    customerName: `${refund.customer.firstName} ${refund.customer.lastName}`,
    totalRefundAmount: refund.amount,
    customerAddress: `${refund.customer.address1}, ${refund.customer.city}, ${refund.customer.state}, ${refund.customer.zip}`,
    itemsPrice: refund.refundItems.reduce(
      (acc, item) =>
        acc + parseFloat(parseFloat(item.unitPrice) * item.returnQty),
      0
    ),
    state: refund.customer.state,
    merchantName: refund.vendor.commercialName,
    deductionPercentage: feePercentage,
  };
};

const issueAgreement = async (refundId, agreementDate, isSigned) => {
  return getRefundAgreementAsHTML(
    await getRefundData(refundId),
    agreementDate,
    isSigned
  );
};

const generateAgreementFile = async (
  refundId,
  agreementDate,
  agreementSigned
) => {
  const fileName = `refund_agreement_${Date.now()}.pdf`;
  const filePath = path.join(__dirname, fileName);
  const fileStream = fs.createWriteStream(filePath);

  const agreementData = await getRefundData(refundId);

  await new Promise((resolve) => {
    let htmlContent = getRefundAgreementAsHTML(
      agreementData,
      agreementDate,
      agreementSigned
    );
    if (agreementSigned) {
      htmlContent = `<h3 style="text-align:center;margin-bottom:0;">Instant Refund Agreement</h3><br/><br/>${htmlContent}`;
    }

    htmlContent = `
    <html>
      <head>
        <style>
        body {
          margin: 50px 50px 20px 50px;
          line-height: 1.2rem;
          font-size: 12px;
        }
        li {
          margin-bottom: 10px;
        }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    
    `;

    htmlPdf.create(htmlContent, { width: 410 }).toStream((err, stream) => {
      if (stream) {
        stream.pipe(fileStream);
        fileStream.on('finish', () => resolve());
      } else {
        generateTextFile(
          fileStream,
          agreementData,
          agreementSigned,
          agreementDate
        )
          .then(resolve)
          .catch((err) => console.log(err) && resolve());
      }
    });
  });

  return filePath;
};

const generateTextFile = async (
  fileStream,
  agreementData,
  agreementSigned,
  agreementDate
) => {
  let pdfDoc = new PDFDocument({ size: 'A4' });
  const stream = pdfDoc.pipe(fileStream);

  return await new Promise((resolve) => {
    if (agreementSigned) {
      pdfDoc
        .fontSize(18)
        .text(
          `Instant Refund Agreement`,
          100,
          20,
          { align: 'center' }
        );
    }

    pdfDoc.fontSize(12);
    pdfDoc.text(
      getRefundAgreementAsText(agreementData, agreementDate, agreementSigned),
      {
        width: 410,
        align: 'justify',
        lineGap: 1,
        paragraphGap: 5,
      }
    );

    pdfDoc.end();

    stream.on('finish', () => {
      resolve();
    });
  });
};

const getAgreementURL = async (refundId, agreementDate, agreementSigned) => {
  const filePath = await generateAgreementFile(
    refundId,
    agreementDate,
    agreementSigned
  );

  const fileKey = await storageService.uploadFile(
    filePath,
    filePath.split('/').pop()
  );
  const url = `${process.env.API_URL}storage${fileKey}`;

  fs.unlink(filePath, () => {});

  return url;
};

module.exports = {
  issueAgreement,
  getAgreementURL,
  generateAgreementFile,
};
