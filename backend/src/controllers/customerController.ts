import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { CustomerType, CustomerStatus } from '@prisma/client';

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Valid email is required'),
  businessName: z.string().min(2, 'Business name is required'),
  gst: z.string().optional().nullable(),
  customerType: z.nativeEnum(CustomerType).default(CustomerType.WHOLESALE),
  address: z.string().min(3, 'Address is required'),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  notes: z.string().optional().nullable()
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const addFollowUpSchema = z.object({
  note: z.string().min(2, 'Follow-up note cannot be empty'),
  followUpDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null)
});

export async function createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    const customer = await prisma.customer.create({
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
  } catch (err) {
    next(err);
  }
}

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const search = (req.query.search as string || '').trim();
    const status = req.query.status as CustomerStatus | undefined;
    const customerType = req.query.customerType as CustomerType | undefined;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status && Object.values(CustomerStatus).includes(status)) {
      where.status = status;
    }

    if (customerType && Object.values(CustomerType).includes(customerType)) {
      where.customerType = customerType;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
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
      prisma.customer.count({ where })
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
  } catch (err) {
    next(err);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
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
      return next(ApiError.notFound(`Customer with ID ${id} not found`, 'CUSTOMER_NOT_FOUND'));
    }

    return res.status(200).json({ customer });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return next(ApiError.notFound(`Customer with ID ${id} not found`, 'CUSTOMER_NOT_FOUND'));
    }

    const customer = await prisma.customer.update({
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
  } catch (err) {
    next(err);
  }
}

export async function addFollowUp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { note, followUpDate } = req.body;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return next(ApiError.notFound(`Customer with ID ${id} not found`, 'CUSTOMER_NOT_FOUND'));
    }

    const [followUp] = await prisma.$transaction([
      prisma.followUpNote.create({
        data: {
          customerId: id,
          note,
          followUpDate,
          createdBy: req.user?.name || 'System User'
        }
      }),
      ...(followUpDate ? [
        prisma.customer.update({
          where: { id },
          data: { followUpDate }
        })
      ] : [])
    ]);

    return res.status(201).json({
      message: 'Follow-up note added successfully',
      followUp
    });
  } catch (err) {
    next(err);
  }
}
