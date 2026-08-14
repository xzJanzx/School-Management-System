/**
 * SMS — Centralized Express Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isProd = process.env.NODE_ENV === 'production';

  if (err instanceof AppError) {
    logger.warn(`AppError [${err.statusCode}]: ${err.message}`, {
      path: req.path,
      method: req.method,
      details: err.details,
    });

    res.status(err.statusCode).json({
      status: 'error',
      statusCode: err.statusCode,
      message: err.message,
      details: err.details || null,
      ...(isProd ? {} : { stack: err.stack }),
    });
    return;
  }

  // Handle unhandled errors
  logger.error(`Unexpected Server Error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'Internal server error',
    ...(isProd ? {} : { stack: err.stack }),
  });
}
