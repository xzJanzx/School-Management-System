/**
 * SMS — Student Master Documents Service
 */

import { prisma } from '../db/prisma.js';
import { auditService } from './auditService.js';
import { NotFoundError, ValidationError } from '../errors/AppError.js';
import { UserContext } from '../middleware/auth.js';

export interface UploadDocumentInput {
  studentId: string;
  title: string;
  documentType: 'BIRTH_CERTIFICATE' | 'NATIONAL_ID' | 'PASSPORT' | 'MEDICAL_RECORD' | 'PHOTO' | 'OTHER';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export const documentService = {
  async addDocument(input: UploadDocumentInput, user: UserContext) {
    const student = await prisma.student.findUnique({ where: { id: input.studentId } });
    if (!student) {
      throw new NotFoundError(`Student '${input.studentId}' not found`);
    }

    if (!input.title?.trim() || !input.filePath?.trim()) {
      throw new ValidationError('Document title and file path are required');
    }

    const doc = await prisma.studentDocument.create({
      data: {
        studentId: input.studentId,
        title: input.title.trim(),
        documentType: input.documentType || 'OTHER',
        fileName: input.fileName,
        filePath: input.filePath,
        fileSize: input.fileSize || 0,
        mimeType: input.mimeType || 'application/octet-stream',
      },
    });

    await auditService.log({
      entityType: 'STUDENT',
      entityId: input.studentId,
      action: 'DOCUMENT_UPLOAD',
      actor: `${user.role}:${user.userId}`,
      details: {
        documentId: doc.id,
        title: doc.title,
        documentType: doc.documentType,
      },
    });

    return doc;
  },

  async getStudentDocuments(studentId: string) {
    return prisma.studentDocument.findMany({
      where: { studentId },
      orderBy: { uploadedAt: 'desc' },
    });
  },

  async deleteDocument(documentId: string, user: UserContext) {
    const existing = await prisma.studentDocument.findUnique({ where: { id: documentId } });
    if (!existing) {
      throw new NotFoundError(`Document '${documentId}' not found`);
    }

    await prisma.studentDocument.delete({ where: { id: documentId } });

    await auditService.log({
      entityType: 'STUDENT',
      entityId: existing.studentId,
      action: 'DOCUMENT_DELETE',
      actor: `${user.role}:${user.userId}`,
      details: {
        documentId,
        title: existing.title,
      },
    });

    return { success: true };
  },
};
