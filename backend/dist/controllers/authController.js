"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = void 0;
exports.login = login;
exports.getMe = getMe;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const db_js_1 = require("../config/db.js");
const jwt_js_1 = require("../config/jwt.js");
const apiError_js_1 = require("../utils/apiError.js");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Valid email address is required'),
    password: zod_1.z.string().min(1, 'Password is required')
});
async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const user = await db_js_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return next(apiError_js_1.ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS'));
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return next(apiError_js_1.ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS'));
        }
        const tokenPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        const token = (0, jwt_js_1.generateToken)(tokenPayload);
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (err) {
        next(err);
    }
}
async function getMe(req, res, next) {
    try {
        if (!req.user) {
            return next(apiError_js_1.ApiError.unauthorized());
        }
        const user = await db_js_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });
        if (!user) {
            return next(apiError_js_1.ApiError.notFound('User not found'));
        }
        return res.status(200).json({ user });
    }
    catch (err) {
        next(err);
    }
}
