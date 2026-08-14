/**
 * SMS — Module 02 Parent / Guardian Management Router
 */

import { Router, Request, Response, NextFunction } from 'express';
import { guardianService } from '../services/guardianService.js';
import { auditService } from '../services/auditService.js';
import { requirePermission, PERMISSIONS } from '../middleware/auth.js';

export const guardianRouter = Router();

// Create Guardian Master Record
guardianRouter.post(
  '/',
  requirePermission(PERMISSIONS.GUARDIAN_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guardian = await guardianService.createGuardian(req.body, req.user!);
      res.status(201).json(guardian);
    } catch (err) {
      next(err);
    }
  }
);

// Search / List Guardians
guardianRouter.get(
  '/',
  requirePermission(PERMISSIONS.GUARDIAN_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.q as string | undefined;
      const guardians = await guardianService.searchGuardians(query);
      res.json(guardians);
    } catch (err) {
      next(err);
    }
  }
);

// Get Single Guardian Details
guardianRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.GUARDIAN_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guardian = await guardianService.getGuardianById(req.params.id);
      res.json(guardian);
    } catch (err) {
      next(err);
    }
  }
);

// Update Guardian Master Record
guardianRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.GUARDIAN_EDIT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await guardianService.updateGuardian(req.params.id, req.body, req.user!);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// Change Guardian Status (ACTIVE / INACTIVE)
guardianRouter.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.GUARDIAN_STATUS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const updated = await guardianService.changeStatus(req.params.id, status, req.user!);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// Delete Guardian (Blocked if linked to students)
guardianRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.GUARDIAN_EDIT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await guardianService.deleteGuardian(req.params.id, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get Linked Students for Guardian
guardianRouter.get(
  '/:id/students',
  requirePermission(PERMISSIONS.GUARDIAN_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const students = await guardianService.getGuardianStudents(req.params.id);
      res.json(students);
    } catch (err) {
      next(err);
    }
  }
);

// Get Audit Logs for Guardian
guardianRouter.get(
  '/:id/audit-logs',
  requirePermission(PERMISSIONS.GUARDIAN_AUDIT_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guardian = await guardianService.getGuardianById(req.params.id);
      const logs = await auditService.getLogs('GUARDIAN', guardian.id);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  }
);
