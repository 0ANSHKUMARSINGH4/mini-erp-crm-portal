import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[API Error]:', err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  // Handle syntax or JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        message: 'Invalid JSON request payload',
        code: 'INVALID_JSON'
      }
    });
  }

  // Default fallback
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal error occurred';
  const code = err.code || 'INTERNAL_ERROR';

  return res.status(statusCode).json({
    error: {
      message,
      code
    }
  });
}
