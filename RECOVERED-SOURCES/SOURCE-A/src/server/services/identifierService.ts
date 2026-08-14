/**
 * SMS — Permanent Identifier Generation Service
 * Generates unique, immutable, sequential Student ID and File Number.
 */

import { prisma } from '../db/prisma.js';

export const identifierService = {
  /**
   * Generates next sequential permanent Student ID e.g., STD-2026-00001
   */
  async generateStudentId(): Promise<string> {
    const year = new Date().getFullYear();
    const key = `STD_SEQ_${year}`;

    const seq = await prisma.$transaction(async (tx) => {
      const existing = await tx.sequence.findUnique({ where: { key } });

      if (!existing) {
        return tx.sequence.create({
          data: { key, value: 10001 },
        });
      }

      return tx.sequence.update({
        where: { key },
        data: { value: { increment: 1 } },
      });
    });

    return `STD-${year}-${seq.value}`;
  },

  /**
   * Generates next sequential permanent File Number e.g., FN-2026-10001
   */
  async generateFileNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const key = `FN_SEQ_${year}`;

    const seq = await prisma.$transaction(async (tx) => {
      const existing = await tx.sequence.findUnique({ where: { key } });

      if (!existing) {
        return tx.sequence.create({
          data: { key, value: 10001 },
        });
      }

      return tx.sequence.update({
        where: { key },
        data: { value: { increment: 1 } },
      });
    });

    return `FN-${year}-${seq.value}`;
  },

  /**
   * Generates next sequential permanent Guardian ID e.g., GUA-2026-10001
   */
  async generateGuardianId(): Promise<string> {
    const year = new Date().getFullYear();
    const key = `GUA_SEQ_${year}`;

    const seq = await prisma.$transaction(async (tx) => {
      const existing = await tx.sequence.findUnique({ where: { key } });

      if (!existing) {
        return tx.sequence.create({
          data: { key, value: 10001 },
        });
      }

      return tx.sequence.update({
        where: { key },
        data: { value: { increment: 1 } },
      });
    });

    return `GUA-${year}-${seq.value}`;
  },
};
