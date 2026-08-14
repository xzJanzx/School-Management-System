/**
 * SMS — Student Master Data API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { studentService } from '../services/studentService.js';
import { duplicateProtectionService } from '../services/duplicateProtectionService.js';
import { documentService } from '../services/documentService.js';
import { auditService } from '../services/auditService.js';
import { guardianService } from '../services/guardianService.js';
import { requirePermission, PERMISSIONS } from '../middleware/auth.js';

export const studentRouter = Router();

// Check duplicate student
studentRouter.post(
  '/check-duplicate',
  requirePermission(PERMISSIONS.STUDENT_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, dateOfBirth, nationalId, excludeStudentId } = req.body;
      const result = await duplicateProtectionService.checkDuplicate({
        firstName: firstName || '',
        lastName: lastName || '',
        dateOfBirth: dateOfBirth || new Date(),
        nationalId,
        excludeStudentId,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Search & List students
studentRouter.get(
  '/',
  requirePermission(PERMISSIONS.STUDENT_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.query as string | undefined;
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await studentService.searchStudents({ query, status, page, limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get single student detail
studentRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.STUDENT_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await studentService.getStudentById(req.params.id);
      res.json(student);
    } catch (err) {
      next(err);
    }
  }
);

// Create new student
studentRouter.post(
  '/',
  requirePermission(PERMISSIONS.STUDENT_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await studentService.createStudent(req.body, req.user!);
      res.status(201).json(student);
    } catch (err) {
      next(err);
    }
  }
);

// Update student master record (preserves immutable studentId and fileNumber)
studentRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.STUDENT_EDIT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await studentService.updateStudent(req.params.id, req.body, req.user!);
      res.json(student);
    } catch (err) {
      next(err);
    }
  }
);

// Change student status
studentRouter.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.STUDENT_EDIT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, reason } = req.body;
      const student = await studentService.changeStatus(req.params.id, status, reason, req.user!);
      res.json(student);
    } catch (err) {
      next(err);
    }
  }
);

// Get student status history transitions
studentRouter.get(
  '/:id/status-history',
  requirePermission(PERMISSIONS.STUDENT_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await studentService.getStatusHistory(req.params.id);
      res.json(history);
    } catch (err) {
      next(err);
    }
  }
);

// Archive student (Soft-delete preservation)
studentRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.STUDENT_EDIT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body || {};
      const result = await studentService.archiveStudent(req.params.id, reason, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get student guardians (Module 01 - 02 boundary)
studentRouter.get(
  '/:id/guardians',
  requirePermission(PERMISSIONS.STUDENT_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guardians = await guardianService.getStudentGuardians(req.params.id);
      res.json(guardians);
    } catch (err) {
      next(err);
    }
  }
);

// Link guardian to student (Module 01 - 02 boundary)
studentRouter.post(
  '/:id/guardians',
  requirePermission(PERMISSIONS.STUDENT_EDIT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const link = await guardianService.linkGuardian(req.params.id, req.body, req.user!);
      res.status(201).json(link);
    } catch (err) {
      next(err);
    }
  }
);

// Update student-guardian relationship / primary status
studentRouter.patch(
  '/:id/guardians/:guardianId',
  requirePermission(PERMISSIONS.STUDENT_EDIT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await guardianService.updateRelationship(
        req.params.id,
        req.params.guardianId,
        req.body,
        req.user!
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// Unlink guardian from student
studentRouter.delete(
  '/:id/guardians/:guardianId',
  requirePermission(PERMISSIONS.STUDENT_EDIT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await guardianService.unlinkGuardian(req.params.id, req.params.guardianId, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get audit logs for student
studentRouter.get(
  '/:id/audit-logs',
  requirePermission(PERMISSIONS.STUDENT_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await auditService.getLogs('STUDENT', req.params.id);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  }
);

// Get documents for student
studentRouter.get(
  '/:id/documents',
  requirePermission(PERMISSIONS.STUDENT_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docs = await documentService.getStudentDocuments(req.params.id);
      res.json(docs);
    } catch (err) {
      next(err);
    }
  }
);

// Add document for student
studentRouter.post(
  '/:id/documents',
  requirePermission(PERMISSIONS.STUDENT_DOCUMENT_UPLOAD),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await documentService.addDocument(
        {
          studentId: req.params.id,
          ...req.body,
        },
        req.user!
      );
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  }
);

// Delete document
studentRouter.delete(
  '/documents/:docId',
  requirePermission(PERMISSIONS.STUDENT_DOCUMENT_UPLOAD),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await documentService.deleteDocument(req.params.docId, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
