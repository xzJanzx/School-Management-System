/**
 * SMS — Database Connection & Health Infrastructure
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export interface DatabaseHealthResult {
  connected: boolean;
  engine: string;
  latencyMs: number;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const start = Date.now();
  try {
    // Perform simple raw query to test connection
    await prisma.$queryRaw`SELECT 1;`;
    const latencyMs = Date.now() - start;
    return {
      connected: true,
      engine: 'SQLite',
      latencyMs,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Database Connection Check Failed: ${errorMsg}`);
    return {
      connected: false,
      engine: 'SQLite',
      latencyMs: Date.now() - start,
      error: errorMsg,
    };
  }
}
