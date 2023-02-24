const adminService = require('./admin.service');
const { generateAdminJWT } = require('./admin.utils');
const VerificationFactory = require('../../utils/VerificationFactory');
const { logInfo, logError } = require('./logs/logs.service');

const addNewAdmin = async (request, response, next) => {
  const { firstName, lastName, phone, email, role } = request.body;

  try {
    const newAdmin = await adminService.createAdmin({
      firstName,
      lastName,
      phone,
      email,
      role,
    });

    await logInfo({
      action: 'create',
      model: 'admin',
      actionOn: newAdmin.id.toString(),
      updatedBy: request.admin.id,
    });

    response.status(201).send({
      success: true,
      data: newAdmin,
    });
  } catch (error) {
    await logError({
      action: 'create',
      model: 'admin',
      description: JSON.stringify(error),
      actionOn: '',
      updatedBy: request.admin.id,
    });
    next(error);
  }
};

const getAdmins = async (request, response, next) => {
  const { cursor, pageLength, page } = request.query;

  try {
    const data = await adminService.getAllAdmins(cursor, pageLength, page);

    response.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminById = async (request, response, next) => {
  const { id } = request.params;

  try {
    const admin = await adminService.getAdminById(id, request.admin.id);
    response.status(200).send({
      success: true,
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

const updateAdmin = async (request, response, next) => {
  const { id } = request.params;

  try {
    const updatedAdmin = await adminService.updateAdmin(
      id,
      request.body,
      request.admin.id
    );

    response.status(200).send({
      success: true,
      data: updatedAdmin,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAdmin = async (request, response, next) => {
  const { id } = request.params;

  try {
    const deleted = await adminService.deleteAdmin(
      id,
      request.admin.id.toString()
    );

    response.status(200).send({
      success: true,
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

/* Auth methods */
const login = async (request, response) => {
  const { email, password } = request.body;

  const [loggedInAdmin, code] = await adminService.attemptLogin({
    email,
    password,
  });

  if (!loggedInAdmin) {
    return response.status(400).send({
      success: false,
      message: "This email, and password doesn't match our records.",
    });
  }

  if (code) {
    return response.status(201).send({ success: true, twoStepVerify: true });
  }

  const adminJWT = generateAdminJWT(loggedInAdmin.id);

  return response.send({
    success: true,
    token: adminJWT,
    admin: {
      email: loggedInAdmin.email,
      firstName: loggedInAdmin.firstName,
      lastName: loggedInAdmin.lastName,
      phoneLastFour: loggedInAdmin.phone.slice(loggedInAdmin.phone.length - 4),
    },
  });
};

const twoFactorLogin = async (request, response) => {
  const { email, password, code } = request.body;

  const [loggedInAdmin] = await adminService.attemptLogin(
    { email, password },
    true
  );

  const verificationMethod = VerificationFactory(loggedInAdmin.phone);

  const isValid = await verificationMethod.verifyCode(
    code
  );

  if (!isValid || !loggedInAdmin) {
    return response
      .status(400)
      .send({ success: false, message: 'This code doesnt match our records' });
  }

  const adminJWT = generateAdminJWT(loggedInAdmin.id);

  await adminService.updateLastLoginTime(loggedInAdmin.id);

  response.send({
    success: true,
    token: adminJWT,
    admin: {
      email: loggedInAdmin.email,
      firstName: loggedInAdmin.firstName,
      lastName: loggedInAdmin.lastName,
    },
  });
};

const setPassword = async (request, response, next) => {
  const token = request.get('Set-Password-Token');
  const { email, password } = request.body;

  try {
    const data = await adminService.setAdminPassword(token, email, password);

    response.status(200).send({
      success: true,
      data: {
        email: data.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdmins,
  getAdminById,
  addNewAdmin,
  updateAdmin,
  deleteAdmin,
  login,
  twoFactorLogin,
  setPassword,
};
