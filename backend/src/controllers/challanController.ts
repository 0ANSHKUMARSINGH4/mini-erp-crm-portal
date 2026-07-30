import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { generateChallanNumber } from '../utils/challanNumber.js';
import { ChallanStatus, MovementType } from '@prisma/client';

export const challanItemSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive().optional() // If omitted, default to product current unit price
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid('Valid customer ID is required'),
  items: z.array(challanItemSchema).min(1, 'At least one line item is required'),
  status: z.nativeEnum(ChallanStatus).default(ChallanStatus.DRAFT),
  notes: z.string().optional().nullable()
});

export const updateChallanSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(challanItemSchema).min(1).optional(),
  notes: z.string().optional().nullable()
});

export async function createChallan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { customerId, items, status, notes } = req.body;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return next(ApiError.notFound(`Customer with ID ${customerId} not found`, 'CUSTOMER_NOT_FOUND'));
    }

    // Fetch product details for snapshot and stock checks
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate that all products exist
    for (const item of items) {
      if (!productMap.has(item.productId)) {
        return next(ApiError.notFound(`Product with ID ${item.productId} not found`, 'PRODUCT_NOT_FOUND'));
      }
    }

    // If status is CONFIRMED, perform strict stock validation before creating
    if (status === ChallanStatus.CONFIRMED) {
      const shortItems: { productName: string; sku: string; required: number; available: number }[] = [];

      for (const item of items) {
        const prod = productMap.get(item.productId)!;
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
        return next(
          ApiError.unprocessableEntity(
            errorMsg,
            { shortProducts: shortItems },
            'INSUFFICIENT_STOCK'
          )
        );
      }
    }

    // Wrap creation and stock deduction in a DB transaction
    const challan = await prisma.$transaction(async (tx) => {
      const challanNumber = await generateChallanNumber();

      let totalAmount = 0;
      const itemsToCreate = items.map((item: any) => {
        const prod = productMap.get(item.productId)!;
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
          confirmedAt: status === ChallanStatus.CONFIRMED ? new Date() : null,
          items: {
            create: itemsToCreate
          }
        },
        include: {
          customer: true,
          items: true
        }
      });

      if (status === ChallanStatus.CONFIRMED) {
        for (const item of items) {
          const prod = productMap.get(item.productId)!;
          await tx.product.update({
            where: { id: prod.id },
            data: { currentStock: prod.currentStock - item.quantity }
          });

          await tx.stockMovement.create({
            data: {
              productId: prod.id,
              quantity: item.quantity,
              type: MovementType.OUT,
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
  } catch (err) {
    next(err);
  }
}

export async function getChallans(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const search = (req.query.search as string || '').trim();
    const status = req.query.status as ChallanStatus | undefined;
    const customerId = req.query.customerId as string | undefined;

    const where: any = {};

    if (search) {
      where.OR = [
        { challanNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { businessName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (status && Object.values(ChallanStatus).includes(status)) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [challans, total] = await Promise.all([
      prisma.salesChallan.findMany({
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
      prisma.salesChallan.count({ where })
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
  } catch (err) {
    next(err);
  }
}

export async function getChallanById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true
      }
    });

    if (!challan) {
      return next(ApiError.notFound(`Sales Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND'));
    }

    return res.status(200).json({ challan });
  } catch (err) {
    next(err);
  }
}

export async function confirmChallan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existing) {
      return next(ApiError.notFound(`Sales Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND'));
    }

    if (existing.status === ChallanStatus.CONFIRMED) {
      return next(ApiError.badRequest('Sales Challan is already confirmed', 'ALREADY_CONFIRMED'));
    }

    if (existing.status === ChallanStatus.CANCELLED) {
      return next(ApiError.badRequest('Cannot confirm a cancelled Sales Challan', 'CANNOT_CONFIRM_CANCELLED'));
    }

    // Wrap confirmation stock verification and deduction in a strict DB transaction
    const updatedChallan = await prisma.$transaction(async (tx) => {
      // Re-fetch current products for fresh stock levels inside transaction
      const productIds = existing.items.map(i => i.productId).filter(Boolean) as string[];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      const shortItems: { productName: string; sku: string; required: number; available: number }[] = [];

      for (const item of existing.items) {
        if (!item.productId) continue;
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
        throw ApiError.unprocessableEntity(
          errorMsg,
          { shortProducts: shortItems },
          'INSUFFICIENT_STOCK'
        );
      }

      // Stock is sufficient for all line items -> execute stock deduction & logging
      for (const item of existing.items) {
        if (!item.productId) continue;
        const prod = productMap.get(item.productId)!;

        await tx.product.update({
          where: { id: prod.id },
          data: { currentStock: prod.currentStock - item.quantity }
        });

        await tx.stockMovement.create({
          data: {
            productId: prod.id,
            quantity: item.quantity,
            type: MovementType.OUT,
            reason: `Sales Challan Confirmation (${existing.challanNumber})`,
            createdBy: req.user?.name || 'System User'
          }
        });
      }

      return await tx.salesChallan.update({
        where: { id },
        data: {
          status: ChallanStatus.CONFIRMED,
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
  } catch (err) {
    next(err);
  }
}

export async function cancelChallan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existing) {
      return next(ApiError.notFound(`Sales Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND'));
    }

    if (existing.status === ChallanStatus.CANCELLED) {
      return next(ApiError.badRequest('Sales Challan is already cancelled', 'ALREADY_CANCELLED'));
    }

    const cancelledChallan = await prisma.$transaction(async (tx) => {
      // If challan was CONFIRMED, reverse the stock (compensating IN movements)
      if (existing.status === ChallanStatus.CONFIRMED) {
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
                type: MovementType.IN,
                reason: `Cancellation Reversal for Challan (${existing.challanNumber})`,
                createdBy: req.user?.name || 'System User'
              }
            });
          }
        }
      }

      return await tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CANCELLED },
        include: { customer: true, items: true }
      });
    });

    return res.status(200).json({
      message: `Sales Challan ${cancelledChallan.challanNumber} cancelled and stock inventory reversed.`,
      challan: cancelledChallan
    });
  } catch (err) {
    next(err);
  }
}
