"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const apiError_js_1 = require("../utils/apiError.js");
function errorHandler(err, req, res, next) {
    console.error('[API Error]:', err);
    if (err instanceof apiError_js_1.ApiError) {
        return res.status(err.statusCode).json({
            error: {
                message: err.message,
                code: err.code,
                ...(err.details ? { details: err.details } : {})
            }
        });
    }
    // Handle syntax or JSON parse errors
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: {
                message: 'Invalid JSON request payload',
                code: 'INVALID_JSON'
            }
        });
    }
    // Default fallback
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'An unexpected internal error occurred';
    const code = err.code || 'INTERNAL_ERROR';
    return res.status(statusCode).json({
        error: {
            message,
            code
        }
    });
}
