import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/apiError.js';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return next(
          ApiError.unprocessableEntity(
            'Validation failed for input data',
            formattedDetails,
            'VALIDATION_ERROR'
          )
        );
      }
      next(error);
    }
  };
};
