import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { MovementType } from '@prisma/client';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU is required'),
  category: z.string().min(2, 'Category is required'),
  unitPrice: z.number().positive('Unit price must be positive'),
  initialStock: z.number().int().min(0, 'Initial stock cannot be negative').default(0),
  minStockAlert: z.number().int().min(0, 'Min stock alert must be >= 0').default(10),
  location: z.string().min(1, 'Warehouse location is required')
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  unitPrice: z.number().positive().optional(),
  minStockAlert: z.number().int().min(0).optional(),
  location: z.string().min(1).optional(),
  currentStock: z.any().optional() // Accepted to explicitly check & reject direct stock tampering!
});

export const createStockMovementSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  type: z.nativeEnum(MovementType),
  reason: z.string().min(3, 'Reason is required')
});

export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name, sku, category, unitPrice, initialStock, minStockAlert, location } = req.body;

    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return next(ApiError.conflict(`Product with SKU '${sku}' already exists`, 'DUPLICATE_SKU'));
    }

    const product = await prisma.$transaction(async (tx) => {
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
            type: MovementType.IN,
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
  } catch (err) {
    next(err);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const search = (req.query.search as string || '').trim();
    const category = req.query.category as string | undefined;
    const lowStock = req.query.lowStock === 'true';

    const where: any = {};

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
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { stockMovements: true } }
        }
      }),
      prisma.product.count({ where })
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
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!product) {
      return next(ApiError.notFound(`Product with ID ${id} not found`, 'PRODUCT_NOT_FOUND'));
    }

    return res.status(200).json({
      product: {
        ...product,
        isLowStock: product.currentStock <= product.minStockAlert
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { currentStock, sku, ...data } = req.body;

    // Requirement Spec Check: Product edits MUST NOT directly change stock
    if (currentStock !== undefined) {
      return next(
        ApiError.unprocessableEntity(
          'Direct modification of currentStock is prohibited. Stock levels can only be updated via Stock Movements or Confirmed Sales Challans.',
          undefined,
          'DIRECT_STOCK_MUTATION_PROHIBITED'
        )
      );
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return next(ApiError.notFound(`Product with ID ${id} not found`, 'PRODUCT_NOT_FOUND'));
    }

    if (sku && sku.toUpperCase() !== existing.sku) {
      const duplicate = await prisma.product.findUnique({ where: { sku: sku.toUpperCase() } });
      if (duplicate) {
        return next(ApiError.conflict(`Product with SKU '${sku}' already exists`, 'DUPLICATE_SKU'));
      }
    }

    const product = await prisma.product.update({
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
  } catch (err) {
    next(err);
  }
}

export async function createStockMovement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { productId, quantity, type, reason } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return next(ApiError.notFound(`Product with ID ${productId} not found`, 'PRODUCT_NOT_FOUND'));
    }

    if (type === MovementType.OUT && product.currentStock < quantity) {
      return next(
        ApiError.unprocessableEntity(
          `Insufficient stock available for '${product.name}'. Required: ${quantity}, Available: ${product.currentStock}`,
          { productId, available: product.currentStock, requested: quantity },
          'INSUFFICIENT_STOCK'
        )
      );
    }

    const newStock = type === MovementType.IN ? product.currentStock + quantity : product.currentStock - quantity;

    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId,
          quantity,
          type,
          reason,
          createdBy: req.user?.name || 'System User'
        }
      }),
      prisma.product.update({
        where: { id: productId },
        data: { currentStock: newStock }
      })
    ]);

    return res.status(201).json({
      message: `Stock movement logged successfully. New stock: ${updatedProduct.currentStock}`,
      movement,
      product: updatedProduct
    });
  } catch (err) {
    next(err);
  }
}

export async function getStockMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 15));
    const skip = (page - 1) * limit;

    const productId = req.query.productId as string | undefined;
    const type = req.query.type as MovementType | undefined;

    const where: any = {};
    if (productId) where.productId = productId;
    if (type && Object.values(MovementType).includes(type)) where.type = type;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
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
      prisma.stockMovement.count({ where })
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
  } catch (err) {
    next(err);
  }
}
