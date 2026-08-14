/**
 * SMS — API Health Endpoint
 */

import { Router, Request, Response } from 'express';
import { SYSTEM_CONFIG } from '../../config/index.js';
import { checkDatabaseHealth } from '../db/prisma.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  const statusCode = dbHealth.connected ? 200 : 503;

  res.status(statusCode).json({
    status: dbHealth.connected ? 'ok' : 'degraded',
    message: 'API is running',
    system: SYSTEM_CONFIG.name,
    version: SYSTEM_CONFIG.version,
    copyright: SYSTEM_CONFIG.copyright,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbHealth,
  });
});
