const { Prisma } = require('@prisma/client');
class NotUniqueError extends Error {
  constructor(field, value, ...params) {
    super(...params);
    this.name = 'NotUniqueError';
    this.field = field;
    this.value = value;
  }
}

class NotFoundError extends Error {
  constructor(field, ...params) {
    super(...params);
    this.field = field;
  }
}

class MalformedJWTError extends Error {
  constructor(...params) {
    super(...params);
  }
}

class DisabledVendorError extends Error {
  constructor(...params) {
    super(...params);
  }
}
class ExpiredRefundError extends Error {
  constructor(refundId, ...params) {
    super(...params);
    this.refundId = refundId;
  }
}

class NoRtpSupport extends Error {
  constructor(refundId, ...params) {
    super(...params);
  }
}

class CustomErrorHandler {
  static isNotUniqueError(error) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  static isNotFoundError(error) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }
}

class ExternalInvalidEmailError extends Error {
  constructor(...params) {
    super(...params);
  }
}

class ExternalValidationError extends Error {
  constructor(errors,...params) {
    super(...params);
    this.errors = errors;
  }
}

class ExternalServerError extends Error {
  constructor(...params) {
    super(...params);
  }
}

module.exports = {
  NotUniqueError,
  CustomErrorHandler,
  NotFoundError,
  MalformedJWTError,
  ExpiredRefundError,
  NoRtpSupport,
  DisabledVendorError,
  ExternalValidationError,
  ExternalServerError,
  ExternalInvalidEmailError
};
