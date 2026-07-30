"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorizeRoles = authorizeRoles;
const jwt_js_1 = require("../config/jwt.js");
const apiError_js_1 = require("../utils/apiError.js");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(apiError_js_1.ApiError.unauthorized('Access denied. No authentication token provided.'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_js_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (err) {
        return next(apiError_js_1.ApiError.unauthorized('Invalid or expired authentication token.'));
    }
}
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(apiError_js_1.ApiError.unauthorized('Authentication required.'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(apiError_js_1.ApiError.forbidden(`Role '${req.user.role}' is not authorized to access this resource.`));
        }
        next();
    };
}
