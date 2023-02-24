const { log: Log } = require('../../../prisma/prismaClient');
const { preparePagination } = require('../../admin/admin.utils');
const { calculatenNextCursor } = require('../../../utils/Pagination');

const retrieveLogs = async (cursor, pageLength, page) => {
  const totalCount = await Log.count();

  const paginationData = preparePagination(
    cursor,
    pageLength,
    totalCount,
    page
  );

  const logs = await Log.findMany({
    ...paginationData.pagination,
    include: {
      updatedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    logs,
    totalCount,
    totalPages: paginationData.totalPages,
    nextCursor: calculatenNextCursor(logs),
    currentPage: Number.parseInt(page),
  };
};

const logInfo = async (logData) => {
  const { updatedBy, ...rest } = logData;
  return await Log.create({
    data: {
      level: 'info',
      ...rest,
      updatedBy: {
        connect: {
          id: parseInt(updatedBy),
        },
      },
    },
  });
};

const logError = async ({
  action,
  model,
  description = '',
  actionOn,
  updatedBy,
}) => {
  return await Log.create({
    data: {
      level: 'error',
      action,
      model,
      actionOn,
      description,
      updatedBy: {
        connect: {
          id: parseInt(updatedBy),
        },
      },
    },
  });
};

module.exports = {
  retrieveLogs,
  logInfo,
  logError,
};
