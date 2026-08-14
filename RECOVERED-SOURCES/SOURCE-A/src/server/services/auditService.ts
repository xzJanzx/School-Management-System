/**
 * SMS — Audit Trail Service
 */

import { prisma } from '../db/prisma.js';
import { logger } from '../logger.js';

export interface AuditLogInput {
  entityType: string;
  entityId?: string;
  action: string;
  details?: Record<string, unknown> | string;
  actor?: string;
  reason?: string;
}

export const auditService = {
  async log(input: AuditLogInput, txClient?: any) {
    try {
      const detailsStr =
        typeof input.details === 'object' ? JSON.stringify(input.details) : input.details;

      const client = txClient || prisma;
      const log = await client.auditLog.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          details: detailsStr,
          actor: input.actor || 'SYSTEM',
          reason: input.reason,
        },
      });

      logger.info(`[AUDIT] ${input.action} on ${input.entityType} (${input.entityId || 'N/A'}) by ${input.actor || 'SYSTEM'}`);
      return log;
    } catch (err) {
      logger.error('Failed to write audit log:', err);
      // Audit log failures shouldn't block main operation, but logged
      return null;
    }
  },

  async getLogs(entityType: string, entityId?: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType,
        ...(entityId ? { entityId } : {}),
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return logs.map((log) => {
      let parsedDetails = log.details;
      if (typeof log.details === 'string') {
        try {
          parsedDetails = JSON.parse(log.details);
        } catch {
          parsedDetails = log.details;
        }
      }
      return {
        ...log,
        details: parsedDetails,
      };
    });
  },
};
