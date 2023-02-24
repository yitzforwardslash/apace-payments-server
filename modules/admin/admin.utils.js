const jwt = require('jsonwebtoken');
const { calculateTotalPages } = require('../../utils/Pagination');
const { isNumeric } = require('validator');
const sendGrid = require('../../utils/SendGrid');

const sendAdminSetPasswordEmail = async (email, firstName, token) => {
  const sendGridProcess = await sendGrid.send({
    dynamicTemplateData: {
      passwordLink: `${process.env.APACE_ADMIN_SET_PASSWORD_URL}?email=${email}&token=${token}`,
      firstName: firstName,
    },
    from: {
      email: process.env.SENDING_EMAIL_VENDORS,
      name: 'Apace admin portal',
    },
    templateId: process.env.SENDGRID_SET_PASSWORD_TEMPLATE_ID,
    to: email,
  });

  return sendGridProcess[0].statusCode === 202;
};

const generateAdminJWT = (adminId, expirationTimeInSeconds = 3600) => {
  return jwt.sign(
    {
      id: adminId,
    },
    process.env.JWT_SECRET,
    { expiresIn: expirationTimeInSeconds }
  );
};

const getDateRangeFilter = (dates, dateFieldName) => {
  let whereData = {
    [dateFieldName]: {},
  };

  if (dates?.from) {
    whereData[dateFieldName].gte = new Date(dates.from).toISOString();
  }

  if (dates?.to) {
    whereData[dateFieldName].lte = new Date(dates.to).toISOString();
  }

  return whereData;
};

const preparePagination = (cursor, pageLength, totalCount, page = null) => {
  let skipCount = 0,
    pagination = {};

  pageLength = pageLength ? Number.parseInt(pageLength) : 10;

  if (cursor) {
    skipCount = 1;
    cursor = isNumeric(cursor) ? parseInt(cursor) : cursor;
    pagination.cursor = { id: cursor };
  }

  if (page && !cursor) {
    skipCount = Number.parseInt(page) * pageLength - pageLength;
  }

  const totalPages = calculateTotalPages(totalCount, pageLength);

  pagination = {
    ...pagination,
    skip: skipCount,
    take: pageLength,
  };

  return {
    pagination,
    totalPages,
  };
};

module.exports = {
  generateAdminJWT,
  getDateRangeFilter,
  preparePagination,
  sendAdminSetPasswordEmail,
};
