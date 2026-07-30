"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStockMovementSchema = exports.updateProductSchema = exports.createProductSchema = void 0;
exports.createProduct = createProduct;
exports.getProducts = getProducts;
exports.getProductById = getProductById;
exports.updateProduct = updateProduct;
exports.createStockMovement = createStockMovement;
exports.getStockMovements = getStockMovements;
const zod_1 = require("zod");
const db_js_1 = require("../config/db.js");
const apiError_js_1 = require("../utils/apiError.js");
const client_1 = require("@prisma/client");
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Product name is required'),
    sku: zod_1.z.string().min(2, 'SKU is required'),
    category: zod_1.z.string().min(2, 'Category is required'),
    unitPrice: zod_1.z.number().positive('Unit price must be positive'),
    initialStock: zod_1.z.number().int().min(0, 'Initial stock cannot be negative').default(0),
    minStockAlert: zod_1.z.number().int().min(0, 'Min stock alert must be >= 0').default(10),
    location: zod_1.z.string().min(1, 'Warehouse location is required')
});
exports.updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    sku: zod_1.z.string().min(2).optional(),
    category: zod_1.z.string().min(2).optional(),
    unitPrice: zod_1.z.number().positive().optional(),
    minStockAlert: zod_1.z.number().int().min(0).optional(),
    location: zod_1.z.string().min(1).optional(),
    currentStock: zod_1.z.any().optional() // Accepted to explicitly check & reject direct stock tampering!
});
exports.createStockMovementSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid('Valid product ID is required'),
    quantity: zod_1.z.number().int().positive('Quantity must be greater than 0'),
    type: zod_1.z.nativeEnum(client_1.MovementType),
    reason: zod_1.z.string().min(3, 'Reason is required')
});
async function createProduct(req, res, next) {
    try {
        const { name, sku, category, unitPrice, initialStock, minStockAlert, location } = req.body;
        const existingSku = await db_js_1.prisma.product.findUnique({ where: { sku } });
        if (existingSku) {
            return next(apiError_js_1.ApiError.conflict(`Product with SKU '${sku}' already exists`, 'DUPLICATE_SKU'));
        }
        const product = await db_js_1.prisma.$transaction(async (tx) => {
            const newProd = await tx.product.create({
                data: {
                    name,
                    sku: sku.toUpperCase(),
                    category,
                    unitPrice,
                    currentStock: initialStock,
                    minStockAlert,
                    location
                }
            });
            if (initialStock > 0) {
                await tx.stockMovement.create({
                    data: {
                        productId: newProd.id,
                        quantity: initialStock,
                        type: client_1.MovementType.IN,
                        reason: 'Initial Product Stock Registration',
                        createdBy: req.user?.name || 'System User'
                    }
                });
            }
            return newProd;
        });
        return res.status(201).json({
            message: 'Product created successfully',
            product
        });
    }
    catch (err) {
        next(err);
    }
}
async function getProducts(req, res, next) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const category = req.query.category;
        const lowStock = req.query.lowStock === 'true';
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (category) {
            where.category = { equals: category, mode: 'insensitive' };
        }
        const [products, total] = await Promise.all([
            db_js_1.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { stockMovements: true } }
                }
            }),
            db_js_1.prisma.product.count({ where })
        ]);
        // Compute low stock status flag for convenience
        const productsWithFlags = products.map(p => ({
            ...p,
            isLowStock: p.currentStock <= p.minStockAlert
        })).filter(p => !lowStock || p.isLowStock);
        return res.status(200).json({
            products: productsWithFlags,
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
async function getProductById(req, res, next) {
    try {
        const { id } = req.params;
        const product = await db_js_1.prisma.product.findUnique({
            where: { id },
            include: {
                stockMovements: {
                    orderBy: { timestamp: 'desc' }
                }
            }
        });
        if (!product) {
            return next(apiError_js_1.ApiError.notFound(`Product with ID ${id} not found`, 'PRODUCT_NOT_FOUND'));
        }
        return res.status(200).json({
            product: {
                ...product,
                isLowStock: product.currentStock <= product.minStockAlert
            }
        });
    }
    catch (err) {
        next(err);
    }
}
async function updateProduct(req, res, next) {
    try {
        const { id } = req.params;
        const { currentStock, sku, ...data } = req.body;
        // Requirement Spec Check: Product edits MUST NOT directly change stock
        if (currentStock !== undefined) {
            return next(apiError_js_1.ApiError.unprocessableEntity('Direct modification of currentStock is prohibited. Stock levels can only be updated via Stock Movements or Confirmed Sales Challans.', undefined, 'DIRECT_STOCK_MUTATION_PROHIBITED'));
        }
        const existing = await db_js_1.prisma.product.findUnique({ where: { id } });
        if (!existing) {
            return next(apiError_js_1.ApiError.notFound(`Product with ID ${id} not found`, 'PRODUCT_NOT_FOUND'));
        }
        if (sku && sku.toUpperCase() !== existing.sku) {
            const duplicate = await db_js_1.prisma.product.findUnique({ where: { sku: sku.toUpperCase() } });
            if (duplicate) {
                return next(apiError_js_1.ApiError.conflict(`Product with SKU '${sku}' already exists`, 'DUPLICATE_SKU'));
            }
        }
        const product = await db_js_1.prisma.product.update({
            where: { id },
            data: {
                ...data,
                ...(sku ? { sku: sku.toUpperCase() } : {})
            }
        });
        return res.status(200).json({
            message: 'Product details updated successfully',
            product
        });
    }
    catch (err) {
        next(err);
    }
}
async function createStockMovement(req, res, next) {
    try {
        const { productId, quantity, type, reason } = req.body;
        const product = await db_js_1.prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            return next(apiError_js_1.ApiError.notFound(`Product with ID ${productId} not found`, 'PRODUCT_NOT_FOUND'));
        }
        if (type === client_1.MovementType.OUT && product.currentStock < quantity) {
            return next(apiError_js_1.ApiError.unprocessableEntity(`Insufficient stock available for '${product.name}'. Required: ${quantity}, Available: ${product.currentStock}`, { productId, available: product.currentStock, requested: quantity }, 'INSUFFICIENT_STOCK'));
        }
        const newStock = type === client_1.MovementType.IN ? product.currentStock + quantity : product.currentStock - quantity;
        const [movement, updatedProduct] = await db_js_1.prisma.$transaction([
            db_js_1.prisma.stockMovement.create({
                data: {
                    productId,
                    quantity,
                    type,
                    reason,
                    createdBy: req.user?.name || 'System User'
                }
            }),
            db_js_1.prisma.product.update({
                where: { id: productId },
                data: { currentStock: newStock }
            })
        ]);
        return res.status(201).json({
            message: `Stock movement logged successfully. New stock: ${updatedProduct.currentStock}`,
            movement,
            product: updatedProduct
        });
    }
    catch (err) {
        next(err);
    }
}
async function getStockMovements(req, res, next) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
        const skip = (page - 1) * limit;
        const productId = req.query.productId;
        const type = req.query.type;
        const where = {};
        if (productId)
            where.productId = productId;
        if (type && Object.values(client_1.MovementType).includes(type))
            where.type = type;
        const [movements, total] = await Promise.all([
            db_js_1.prisma.stockMovement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { timestamp: 'desc' },
                include: {
                    product: {
                        select: { id: true, name: true, sku: true }
                    }
                }
            }),
            db_js_1.prisma.stockMovement.count({ where })
        ]);
        return res.status(200).json({
            movements,
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
