const bcrypt = require('bcrypt');
const { admin: Admin } = require('../../prisma/prismaClient');
const {
  CustomErrorHandler,
  NotUniqueError,
  NotFoundError,
} = require('../../utils/CustomError');
const VerificationFactory = require('../../utils/VerificationFactory');
const {
  preparePagination,
  generateAdminJWT,
  sendAdminSetPasswordEmail,
} = require('./admin.utils');
const { calculatenNextCursor } = require('../../utils/Pagination');
const { logInfo, logError } = require('./logs/logs.service');
const jwt = require('jsonwebtoken');
const customErrors = require('../../utils/CustomError');
const saltRounds = 15;

const getAllAdmins = async (cursor, pageLength, page) => {
  const totalCount = await Admin.count();

  const paginationData = preparePagination(
    cursor,
    pageLength,
    totalCount,
    page
  );

  const admins = await Admin.findMany({
    ...paginationData.pagination,
  });

  return {
    admins,
    totalCount,
    totalPages: paginationData.totalPages,
    nextCursor: calculatenNextCursor(admins),
    currentPage: Number.parseInt(page),
  };
};

const getAdminById = async (adminId) => {
  const admin = await Admin.findUnique({
    where: { id: parseInt(adminId) },
  });

  if (!admin) {
    throw new NotFoundError('Admin');
  }

  return admin;
};

const createAdmin = async (data) => {
  let createdAdmin = await Admin.create({ data }).catch((error) => {
    if (CustomErrorHandler.isNotUniqueError(error)) {
      const notUniqueProperty = error.meta.target[0];
      throw new NotUniqueError(notUniqueProperty, data[notUniqueProperty]);
    }
  });

  if (createdAdmin) {
    const setPasswordToken = generateAdminJWT(
      createdAdmin.id,
      60 * 60 * 24 * 2
    ); // two days

    createdAdmin = await Admin.update({
      where: { id: createdAdmin.id },
      data: {
        setPasswordToken,
      },
    });

    await sendAdminSetPasswordEmail(
      createdAdmin.email,
      createdAdmin.firstName,
      setPasswordToken
    );
  }

  return createdAdmin;
};

const updateAdmin = async (id, data, updatedBy) => {
  const admin = await Admin.findUnique({ where: { id: parseInt(id) } });

  if (data.password) {
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    data = { ...data, password: hashedPassword };
  }

  try {
    const updatedAdmin = await Admin.update({
      where: { id: parseInt(id) },
      data,
    });

    await logAdminUpdated(admin, updatedAdmin, Object.keys(data), updatedBy);

    return updatedAdmin;
  } catch (error) {
    await logError({
      action: 'update',
      model: 'admin',
      description: JSON.stringify(error),
      actionOn: '',
      updatedBy: updatedBy,
    });

    if (CustomErrorHandler.isNotUniqueError(error)) {
      const notUniqueProperty = error.meta.target[0];
      throw new NotUniqueError(notUniqueProperty, data[notUniqueProperty]);
    }

    throw new Error('Error while updating admin.');
  }
};

const setAdminPassword = async (token, email, password) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded.id) {
    throw new customErrors.MalformedJWTError();
  }

  const admin = await Admin.findFirst({
    where: {
      email,
      id: decoded.id,
      setPasswordToken: token,
    },
  });

  if (!admin) {
    throw new Error('User not found or wrong token provided.');
  }

  return await updateAdmin(
    admin.id,
    {
      password,
      setPasswordToken: null,
    },
    admin.id
  );
};

const deleteAdmin = async (adminId, updatedBy) => {
  try {
    const deleted = await Admin.delete({
      where: { id: parseInt(adminId) },
    });

    await logInfo({
      action: 'delete',
      model: 'admin',
      actionOn: adminId.toString(),
      updatedBy,
    });

    return deleted;
  } catch (error) {
    await logError({
      action: 'delete',
      model: 'admin',
      description: JSON.stringify(error),
      actionOn: adminId.toString(),
      updatedBy,
    });

    if (CustomErrorHandler.isNotFoundError(error)) {
      throw new NotFoundError('Admin');
    }

    throw new Error('Error while deleting admin.');
  }
};

/* Auth methods */
const attemptLogin = async (data, hasCode = false) => {
  const admin = await Admin.findUnique({ where: { email: data.email } });

  if (!admin) {
    return [false, null];
  }

  const passwordMatches = await bcrypt.compare(data.password, admin.password);

  if (!passwordMatches) {
    return [false, null];
  }

  if (process.env.NODE_ENV === 'development') {
    await updateLastLoginTime(admin.id);
    return [admin, null];
  }

  if (admin.allow_twostepverify && !hasCode) {
    const verificationMethod = VerificationFactory(admin.phone, 'vendor');
    await verificationMethod.sendCode();
    return [admin, true];
  }

  return [admin, null];
};

const updateLastLoginTime = async (id) => {
  return await Admin.update({
    where: {
      id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });
};

const logAdminUpdated = async (
  oldAdmin,
  newAdmin,
  updatedFields,
  updatedBy
) => {
  const oldValues = {};
  const newValues = {};

  updatedFields.map((key) => {
    if (oldAdmin[key] !== newAdmin[key]) {
      oldValues[key] = oldAdmin[key];
      newValues[key] = newAdmin[key];
    }
  });

  await logInfo({
    action: 'update',
    model: 'admin',
    actionOn: oldAdmin.id.toString(),
    updatedBy: updatedBy.toString(),
    updatedFields: updatedFields,
    oldValues,
    newValues,
  });
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  setAdminPassword,
  deleteAdmin,
  attemptLogin,
  updateLastLoginTime,
};
