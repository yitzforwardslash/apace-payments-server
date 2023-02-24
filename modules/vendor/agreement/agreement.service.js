const { getVendorAgreementAsHTML, getVendorAgreementAsText } = require('./agreement.utils');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const htmlPdf = require('html-pdf');
const storageService = require('../../storage/storage.service');

const issueAgreement = (agreementData) => {
  return getVendorAgreementAsHTML(agreementData);
};

const downloadAgreement = async (agreementData) => {
  return await getAgreementURL(agreementData);
};

const generateAgreementFile = async (
  agreementData,
  agreementDate,
  agreementSigned
) => {
  const fileName = `vendor_agreement_${Date.now()}.pdf`;
  const filePath = path.join(__dirname, fileName);
  const fileStream = fs.createWriteStream(filePath);

  await new Promise((resolve) => {
    let htmlContent = getVendorAgreementAsHTML(
      agreementData,
      agreementSigned,
      agreementDate
    );
    if (agreementSigned) {
      htmlContent = `<h3 style="text-align:center;margin-bottom:0;">Agreement betwen Apace Refunds and ${agreementData.commercialName}</h3><br/><br/>${htmlContent}`;
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
        console.log(err);
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
          `Agreement betwen Apace Refunds and ${agreementData.commercialName}`,
          100,
          20,
          { align: 'center' }
        );
    }

    pdfDoc.fontSize(12);
    pdfDoc.text(
      getVendorAgreementAsText(agreementData, agreementSigned, agreementDate),
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

const getAgreementURL = async (
  agreementData,
  agreementDate,
  agreementSigned
) => {
  const filePath = await generateAgreementFile(
    agreementData,
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
  downloadAgreement,
  getAgreementURL,
  generateAgreementFile,
};
