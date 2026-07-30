"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFollowUpSchema = exports.updateCustomerSchema = exports.createCustomerSchema = void 0;
exports.createCustomer = createCustomer;
exports.getCustomers = getCustomers;
exports.getCustomerById = getCustomerById;
exports.updateCustomer = updateCustomer;
exports.addFollowUp = addFollowUp;
const zod_1 = require("zod");
const db_js_1 = require("../config/db.js");
const apiError_js_1 = require("../utils/apiError.js");
const client_1 = require("@prisma/client");
exports.createCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    mobile: zod_1.z.string().min(10, 'Mobile must be at least 10 digits'),
    email: zod_1.z.string().email('Valid email is required'),
    businessName: zod_1.z.string().min(2, 'Business name is required'),
    gst: zod_1.z.string().optional().nullable(),
    customerType: zod_1.z.nativeEnum(client_1.CustomerType).default(client_1.CustomerType.WHOLESALE),
    address: zod_1.z.string().min(3, 'Address is required'),
    status: zod_1.z.nativeEnum(client_1.CustomerStatus).default(client_1.CustomerStatus.LEAD),
    followUpDate: zod_1.z.string().optional().nullable().transform(val => val ? new Date(val) : null),
    notes: zod_1.z.string().optional().nullable()
});
exports.updateCustomerSchema = exports.createCustomerSchema.partial();
exports.addFollowUpSchema = zod_1.z.object({
    note: zod_1.z.string().min(2, 'Follow-up note cannot be empty'),
    followUpDate: zod_1.z.string().optional().nullable().transform(val => val ? new Date(val) : null)
});
async function createCustomer(req, res, next) {
    try {
        const data = req.body;
        const customer = await db_js_1.prisma.customer.create({
            data: {
                ...data,
                followUps: data.notes ? {
                    create: [{
                            note: data.notes,
                            followUpDate: data.followUpDate,
                            createdBy: req.user?.name || 'System User'
                        }]
                } : undefined
            },
            include: {
                followUps: true
            }
        });
        return res.status(201).json({
            message: 'Customer created successfully',
            customer
        });
    }
    catch (err) {
        next(err);
    }
}
async function getCustomers(req, res, next) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const status = req.query.status;
        const customerType = req.query.customerType;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } },
                { businessName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (status && Object.values(client_1.CustomerStatus).includes(status)) {
            where.status = status;
        }
        if (customerType && Object.values(client_1.CustomerType).includes(customerType)) {
            where.customerType = customerType;
        }
        const [customers, total] = await Promise.all([
            db_js_1.prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { followUps: true, challans: true }
                    }
                }
            }),
            db_js_1.prisma.customer.count({ where })
        ]);
        return res.status(200).json({
            customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (err) {
        next(err);
    }
}
async function getCustomerById(req, res, next) {
    try {
        const { id } = req.params;
        const customer = await db_js_1.prisma.customer.findUnique({
            where: { id },
            include: {
                followUps: {
                    orderBy: { createdAt: 'desc' }
                },
                challans: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });
        if (!customer) {
            return next(apiError_js_1.ApiError.notFound(`Customer with ID ${id} not found`, 'CUSTOMER_NOT_FOUND'));
        }
        return res.status(200).json({ customer });
    }
    catch (err) {
        next(err);
    }
}
async function updateCustomer(req, res, next) {
    try {
        const { id } = req.params;
        const data = req.body;
        const existing = await db_js_1.prisma.customer.findUnique({ where: { id } });
        if (!existing) {
            return next(apiError_js_1.ApiError.notFound(`Customer with ID ${id} not found`, 'CUSTOMER_NOT_FOUND'));
        }
        const customer = await db_js_1.prisma.customer.update({
            where: { id },
            data,
            include: {
                followUps: true
            }
        });
        return res.status(200).json({
            message: 'Customer updated successfully',
            customer
        });
    }
    catch (err) {
        next(err);
    }
}
async function addFollowUp(req, res, next) {
    try {
        const { id } = req.params;
        const { note, followUpDate } = req.body;
        const customer = await db_js_1.prisma.customer.findUnique({ where: { id } });
        if (!customer) {
            return next(apiError_js_1.ApiError.notFound(`Customer with ID ${id} not found`, 'CUSTOMER_NOT_FOUND'));
        }
        const [followUp] = await db_js_1.prisma.$transaction([
            db_js_1.prisma.followUpNote.create({
                data: {
                    customerId: id,
                    note,
                    followUpDate,
                    createdBy: req.user?.name || 'System User'
                }
            }),
            ...(followUpDate ? [
                db_js_1.prisma.customer.update({
                    where: { id },
                    data: { followUpDate }
                })
            ] : [])
        ]);
        return res.status(201).json({
            message: 'Follow-up note added successfully',
            followUp
        });
    }
    catch (err) {
        next(err);
    }
}
