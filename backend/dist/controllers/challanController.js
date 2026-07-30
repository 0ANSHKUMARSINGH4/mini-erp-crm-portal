"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateChallanSchema = exports.createChallanSchema = exports.challanItemSchema = void 0;
exports.createChallan = createChallan;
exports.getChallans = getChallans;
exports.getChallanById = getChallanById;
exports.confirmChallan = confirmChallan;
exports.cancelChallan = cancelChallan;
const zod_1 = require("zod");
const db_js_1 = require("../config/db.js");
const apiError_js_1 = require("../utils/apiError.js");
const challanNumber_js_1 = require("../utils/challanNumber.js");
const client_1 = require("@prisma/client");
exports.challanItemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid('Valid product ID is required'),
    quantity: zod_1.z.number().int().positive('Quantity must be greater than 0'),
    unitPrice: zod_1.z.number().positive().optional() // If omitted, default to product current unit price
});
exports.createChallanSchema = zod_1.z.object({
    customerId: zod_1.z.string().uuid('Valid customer ID is required'),
    items: zod_1.z.array(exports.challanItemSchema).min(1, 'At least one line item is required'),
    status: zod_1.z.nativeEnum(client_1.ChallanStatus).default(client_1.ChallanStatus.DRAFT),
    notes: zod_1.z.string().optional().nullable()
});
exports.updateChallanSchema = zod_1.z.object({
    customerId: zod_1.z.string().uuid().optional(),
    items: zod_1.z.array(exports.challanItemSchema).min(1).optional(),
    notes: zod_1.z.string().optional().nullable()
});
async function createChallan(req, res, next) {
    try {
        const { customerId, items, status, notes } = req.body;
        const customer = await db_js_1.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            return next(apiError_js_1.ApiError.notFound(`Customer with ID ${customerId} not found`, 'CUSTOMER_NOT_FOUND'));
        }
        // Fetch product details for snapshot and stock checks
        const productIds = items.map((i) => i.productId);
        const products = await db_js_1.prisma.product.findMany({
            where: { id: { in: productIds } }
        });
        const productMap = new Map(products.map(p => [p.id, p]));
        // Validate that all products exist
        for (const item of items) {
            if (!productMap.has(item.productId)) {
                return next(apiError_js_1.ApiError.notFound(`Product with ID ${item.productId} not found`, 'PRODUCT_NOT_FOUND'));
            }
        }
        // If status is CONFIRMED, perform strict stock validation before creating
        if (status === client_1.ChallanStatus.CONFIRMED) {
            const shortItems = [];
            for (const item of items) {
                const prod = productMap.get(item.productId);
                if (prod.currentStock < item.quantity) {
                    shortItems.push({
                        productName: prod.name,
                        sku: prod.sku,
                        required: item.quantity,
                        available: prod.currentStock
                    });
                }
            }
            if (shortItems.length > 0) {
                const errorMsg = `Insufficient stock for products: ${shortItems.map(s => `'${s.productName}' (Available: ${s.available}, Required: ${s.required})`).join(', ')}`;
                return next(apiError_js_1.ApiError.unprocessableEntity(errorMsg, { shortProducts: shortItems }, 'INSUFFICIENT_STOCK'));
            }
        }
        // Wrap creation and stock deduction in a DB transaction
        const challan = await db_js_1.prisma.$transaction(async (tx) => {
            const challanNumber = await (0, challanNumber_js_1.generateChallanNumber)();
            let totalAmount = 0;
            const itemsToCreate = items.map((item) => {
                const prod = productMap.get(item.productId);
                const price = item.unitPrice !== undefined ? item.unitPrice : prod.unitPrice;
                totalAmount += price * item.quantity;
                return {
                    productId: prod.id,
                    productName: prod.name,
                    sku: prod.sku,
                    unitPrice: price,
                    quantity: item.quantity
                };
            });
            const createdChallan = await tx.salesChallan.create({
                data: {
                    challanNumber,
                    customerId,
                    status,
                    totalAmount,
                    notes,
                    createdBy: req.user?.name || 'System User',
                    confirmedAt: status === client_1.ChallanStatus.CONFIRMED ? new Date() : null,
                    items: {
                        create: itemsToCreate
                    }
                },
                include: {
                    customer: true,
                    items: true
                }
            });
            if (status === client_1.ChallanStatus.CONFIRMED) {
                for (const item of items) {
                    const prod = productMap.get(item.productId);
                    await tx.product.update({
                        where: { id: prod.id },
                        data: { currentStock: prod.currentStock - item.quantity }
                    });
                    await tx.stockMovement.create({
                        data: {
                            productId: prod.id,
                            quantity: item.quantity,
                            type: client_1.MovementType.OUT,
                            reason: `Sales Challan Confirmation (${challanNumber})`,
                            createdBy: req.user?.name || 'System User'
                        }
                    });
                }
            }
            return createdChallan;
        });
        return res.status(201).json({
            message: `Sales Challan ${challan.challanNumber} created successfully (${challan.status})`,
            challan
        });
    }
    catch (err) {
        next(err);
    }
}
async function getChallans(req, res, next) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const status = req.query.status;
        const customerId = req.query.customerId;
        const where = {};
        if (search) {
            where.OR = [
                { challanNumber: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
                { customer: { businessName: { contains: search, mode: 'insensitive' } } }
            ];
        }
        if (status && Object.values(client_1.ChallanStatus).includes(status)) {
            where.status = status;
        }
        if (customerId) {
            where.customerId = customerId;
        }
        const [challans, total] = await Promise.all([
            db_js_1.prisma.salesChallan.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: {
                        select: { id: true, name: true, businessName: true, mobile: true }
                    },
                    _count: { select: { items: true } }
                }
            }),
            db_js_1.prisma.salesChallan.count({ where })
        ]);
        return res.status(200).json({
            challans,
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
async function getChallanById(req, res, next) {
    try {
        const { id } = req.params;
        const challan = await db_js_1.prisma.salesChallan.findUnique({
            where: { id },
            include: {
                customer: true,
                items: true
            }
        });
        if (!challan) {
            return next(apiError_js_1.ApiError.notFound(`Sales Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND'));
        }
        return res.status(200).json({ challan });
    }
    catch (err) {
        next(err);
    }
}
async function confirmChallan(req, res, next) {
    try {
        const { id } = req.params;
        const existing = await db_js_1.prisma.salesChallan.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!existing) {
            return next(apiError_js_1.ApiError.notFound(`Sales Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND'));
        }
        if (existing.status === client_1.ChallanStatus.CONFIRMED) {
            return next(apiError_js_1.ApiError.badRequest('Sales Challan is already confirmed', 'ALREADY_CONFIRMED'));
        }
        if (existing.status === client_1.ChallanStatus.CANCELLED) {
            return next(apiError_js_1.ApiError.badRequest('Cannot confirm a cancelled Sales Challan', 'CANNOT_CONFIRM_CANCELLED'));
        }
        // Wrap confirmation stock verification and deduction in a strict DB transaction
        const updatedChallan = await db_js_1.prisma.$transaction(async (tx) => {
            // Re-fetch current products for fresh stock levels inside transaction
            const productIds = existing.items.map(i => i.productId).filter(Boolean);
            const products = await tx.product.findMany({
                where: { id: { in: productIds } }
            });
            const productMap = new Map(products.map(p => [p.id, p]));
            const shortItems = [];
            for (const item of existing.items) {
                if (!item.productId)
                    continue;
                const prod = productMap.get(item.productId);
                const available = prod ? prod.currentStock : 0;
                if (!prod || available < item.quantity) {
                    shortItems.push({
                        productName: item.productName,
                        sku: item.sku,
                        required: item.quantity,
                        available
                    });
                }
            }
            if (shortItems.length > 0) {
                const errorMsg = `Insufficient stock for products: ${shortItems.map(s => `'${s.productName}' (Available: ${s.available}, Required: ${s.required})`).join(', ')}`;
                throw apiError_js_1.ApiError.unprocessableEntity(errorMsg, { shortProducts: shortItems }, 'INSUFFICIENT_STOCK');
            }
            // Stock is sufficient for all line items -> execute stock deduction & logging
            for (const item of existing.items) {
                if (!item.productId)
                    continue;
                const prod = productMap.get(item.productId);
                await tx.product.update({
                    where: { id: prod.id },
                    data: { currentStock: prod.currentStock - item.quantity }
                });
                await tx.stockMovement.create({
                    data: {
                        productId: prod.id,
                        quantity: item.quantity,
                        type: client_1.MovementType.OUT,
                        reason: `Sales Challan Confirmation (${existing.challanNumber})`,
                        createdBy: req.user?.name || 'System User'
                    }
                });
            }
            return await tx.salesChallan.update({
                where: { id },
                data: {
                    status: client_1.ChallanStatus.CONFIRMED,
                    confirmedAt: new Date()
                },
                include: {
                    customer: true,
                    items: true
                }
            });
        });
        return res.status(200).json({
            message: `Sales Challan ${updatedChallan.challanNumber} successfully confirmed and stock decremented.`,
            challan: updatedChallan
        });
    }
    catch (err) {
        next(err);
    }
}
async function cancelChallan(req, res, next) {
    try {
        const { id } = req.params;
        const existing = await db_js_1.prisma.salesChallan.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!existing) {
            return next(apiError_js_1.ApiError.notFound(`Sales Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND'));
        }
        if (existing.status === client_1.ChallanStatus.CANCELLED) {
            return next(apiError_js_1.ApiError.badRequest('Sales Challan is already cancelled', 'ALREADY_CANCELLED'));
        }
        const cancelledChallan = await db_js_1.prisma.$transaction(async (tx) => {
            // If challan was CONFIRMED, reverse the stock (compensating IN movements)
            if (existing.status === client_1.ChallanStatus.CONFIRMED) {
                for (const item of existing.items) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { currentStock: { increment: item.quantity } }
                        });
                        await tx.stockMovement.create({
                            data: {
                                productId: item.productId,
                                quantity: item.quantity,
                                type: client_1.MovementType.IN,
                                reason: `Cancellation Reversal for Challan (${existing.challanNumber})`,
                                createdBy: req.user?.name || 'System User'
                            }
                        });
                    }
                }
            }
            return await tx.salesChallan.update({
                where: { id },
                data: { status: client_1.ChallanStatus.CANCELLED },
                include: { customer: true, items: true }
            });
        });
        return res.status(200).json({
            message: `Sales Challan ${cancelledChallan.challanNumber} cancelled and stock inventory reversed.`,
            challan: cancelledChallan
        });
    }
    catch (err) {
        next(err);
    }
}
