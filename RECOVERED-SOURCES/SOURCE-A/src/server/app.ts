/**
 * SMS — Express Application Factory
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { setupSecurityMiddleware } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { attachUserContext } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';
import { studentRouter } from './routes/students.js';
import { guardianRouter } from './routes/guardians.js';
import { NotFoundError } from './errors/AppError.js';

export function createApp(): Express {
  const app = express();

  // Security Middleware
  setupSecurityMiddleware(app);

  // Body Parsing Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Attach authorization user context
  app.use(attachUserContext);

  // API Routes
  app.use('/api', healthRouter);
  app.use('/api/students', studentRouter);
  app.use('/api/guardians', guardianRouter);

  // 404 Handler for undefined API routes
  app.use('/api/*', (_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError('API endpoint not found'));
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
