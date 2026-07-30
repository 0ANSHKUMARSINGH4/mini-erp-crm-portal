"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const apiError_js_1 = require("../utils/apiError.js");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedDetails = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                return next(apiError_js_1.ApiError.unprocessableEntity('Validation failed for input data', formattedDetails, 'VALIDATION_ERROR'));
            }
            next(error);
        }
    };
};
exports.validate = validate;
