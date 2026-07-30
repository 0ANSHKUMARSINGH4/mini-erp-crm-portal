"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const customerRoutes_js_1 = __importDefault(require("./routes/customerRoutes.js"));
const productRoutes_js_1 = __importDefault(require("./routes/productRoutes.js"));
const stockRoutes_js_1 = __importDefault(require("./routes/stockRoutes.js"));
const challanRoutes_js_1 = __importDefault(require("./routes/challanRoutes.js"));
const error_js_1 = require("./middleware/error.js");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        system: 'Mini ERP + CRM Operations Portal Backend API',
        timestamp: new Date().toISOString()
    });
});
// API Routes
app.use('/api/auth', authRoutes_js_1.default);
app.use('/api/customers', customerRoutes_js_1.default);
app.use('/api/products', productRoutes_js_1.default);
app.use('/api/stock-movements', stockRoutes_js_1.default);
app.use('/api/challans', challanRoutes_js_1.default);
// 404 Route Handler
app.use((req, res, next) => {
    res.status(404).json({
        error: {
            message: `Cannot ${req.method} ${req.originalUrl}`,
            code: 'ROUTE_NOT_FOUND'
        }
    });
});
// Global Error Handler
app.use(error_js_1.errorHandler);
exports.default = app;
