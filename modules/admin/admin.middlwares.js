const customErrors = require("../../utils/CustomError");
const jwt = require("jsonwebtoken");
const adminService = require("./admin.service");

const requireAuthentication = async (request, response, next) => {
    const authorization = request.get('authorization');

    let jwtToken;

    if ( authorization && authorization.toLocaleLowerCase().startsWith('bearer ')) {
        jwtToken = authorization.substring(7);
    } else {
        return next(new customErrors.MalformedJWTError());
    }

    try {
        const decoded = jwt.verify( jwtToken, process.env.JWT_SECRET);

        if (!decoded.id) {
            return next(new customErrors.MalformedJWTError());
        }

        const admin = await adminService.getAdminById(decoded.id);

        if (admin) {
            request.admin = admin;
        }

        next();
    } catch {
        next(new customErrors.MalformedJWTError());
    }
};

const requireSuperAdmin = async (request, response, next) => {
    if (request.admin.role !== 'SuperAdmin') {
        return response.status(401).json({ message: 'Unauthorized action', success: false });
    }

    next();
}

module.exports = {
    requireAuthentication,
    requireSuperAdmin
}