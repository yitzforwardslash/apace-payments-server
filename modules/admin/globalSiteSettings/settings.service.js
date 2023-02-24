const {
  globalSiteSetting: GlobalSiteSetting,
} = require('../../../prisma/prismaClient');
const prisma = require('../../../prisma/prismaClient');
const { preparePagination } = require('../admin.utils');
const { calculatenNextCursor } = require('../../../utils/Pagination');
const { logInfo, logError } = require('../logs/logs.service');
const {
  CustomErrorHandler,
  NotUniqueError,
} = require('../../../utils/CustomError');

const retrieveSettings = async (cursor, pageLength, page) => {
  const totalCount = await GlobalSiteSetting.count();

  const paginationData = preparePagination(
    cursor,
    pageLength,
    totalCount,
    page
  );

  const settings = await GlobalSiteSetting.findMany({
    ...paginationData.pagination,
  });

  return {
    settings,
    totalCount,
    totalPages: paginationData.totalPages,
    nextCursor: calculatenNextCursor(settings),
    currentPage: Number.parseInt(page),
  };
};
const alterSetting = async (settingsObject, updatedBy) => {
  const keys = Object.keys(settingsObject);

  const oldSettings = await GlobalSiteSetting.findMany({
    where: {
      key: {
        in: keys,
      },
    },
  });

  const queries = [];

  keys.map((key) => {
    queries.push(
      GlobalSiteSetting.update({
        where: {
          key,
        },
        data: {
          value: settingsObject[key].toString(),
        },
      })
    );
  });

  try {
    const updatedSettings = await prisma.$transaction(queries);

    await logUpdateInfo(updatedSettings, oldSettings, updatedBy);

    return updatedSettings;
  } catch (error) {
    await logUpdateError(error, updatedBy);

    throw new Error(
      'Error while updating settings, please make sure you used the correct keys.'
    );
  }
};
const addNewSetting = async (data, updatedBy) => {
  const addedSetting = await GlobalSiteSetting.create({ data }).catch(
    (error) => {
      if (CustomErrorHandler.isNotUniqueError(error)) {
        const notUniqueProperty = error.meta.target[0];
        throw new NotUniqueError(notUniqueProperty, data[notUniqueProperty]);
      }
    }
  );

  await logCreateInfo(addedSetting, updatedBy);

  return addedSetting;
};

/* Log data*/
const logUpdateError = async (error, updatedBy) => {
  await logError({
    action: 'update',
    model: 'globalSiteSettings',
    description: JSON.stringify(error),
    actionOn: '',
    updatedBy: updatedBy,
  });
};
const logUpdateInfo = async (updatedSettings, oldSettings, updatedBy) => {
  await logInfo({
    action: 'update',
    model: 'siteGlobalSettings',
    actionOn: updatedSettings.map((t) => t.id).join(),
    updatedBy: updatedBy,
    updatedFields: updatedSettings.map((t) => t.key),
    oldValues: oldSettings,
    newValues: updatedSettings,
  });
};
const logCreateInfo = async (setting, updatedBy) => {
  await logInfo({
    action: 'create',
    model: 'globalSiteSetting',
    actionOn: setting.id.toString(),
    updatedBy: updatedBy,
  });
};

module.exports = {
  retrieveSettings,
  alterSetting,
  addNewSetting,
};
