/**
 * SMS — Student Master Data Core Service
 */

import { prisma } from '../db/prisma.js';
import { identifierService } from './identifierService.js';
import { duplicateProtectionService } from './duplicateProtectionService.js';
import { auditService } from './auditService.js';
import { ValidationError, ConflictError, NotFoundError, AuthorizationError } from '../errors/AppError.js';
import { UserContext, PERMISSIONS } from '../middleware/auth.js';

export interface CreateStudentInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  fullNameArabic?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string | Date;
  placeOfBirth?: string;
  nationality?: string;
  nationalId?: string;
  passportNumber?: string;
  religion?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  overrideDuplicate?: boolean;
  overrideReason?: string;
}

export interface UpdateStudentInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullNameArabic?: string;
  gender?: 'MALE' | 'FEMALE';
  dateOfBirth?: string | Date;
  placeOfBirth?: string;
  nationality?: string;
  nationalId?: string;
  passportNumber?: string;
  religion?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  overrideDuplicate?: boolean;
  overrideReason?: string;
}

export interface StudentSearchFilter {
  query?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const studentService = {
  /**
   * Validate National ID format/length
   */
  validateNationalId(nationalId?: string | null): void {
    if (!nationalId || !nationalId.trim()) return;
    const clean = nationalId.trim();
    if (clean.length < 5 || clean.length > 30) {
      throw new ValidationError('National ID must be between 5 and 30 characters');
    }
  },

  /**
   * Create new permanent Student Master Record
   */
  async createStudent(input: CreateStudentInput, user: UserContext) {
    if (!input.firstName?.trim() || !input.lastName?.trim() || !input.dateOfBirth || !input.gender) {
      throw new ValidationError('First Name, Last Name, Gender, and Date of Birth are required');
    }

    const dob = new Date(input.dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw new ValidationError('Invalid Date of Birth');
    }

    this.validateNationalId(input.nationalId);

    // Duplicate protection check
    const dupCheck = await duplicateProtectionService.checkDuplicate({
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: dob,
      nationalId: input.nationalId,
    });

    if (dupCheck.isDuplicate) {
      if (!input.overrideDuplicate) {
        throw new ConflictError(dupCheck.matchReason || 'Duplicate student record detected', {
          isDuplicate: true,
          matches: dupCheck.matches,
        });
      }

      // Check duplicate override permission
      if (!user.permissions.includes(PERMISSIONS.STUDENT_OVERRIDE_DUPLICATE)) {
        throw new AuthorizationError('Permission denied: Missing student:override_duplicate permission');
      }

      if (!input.overrideReason?.trim()) {
        throw new ValidationError('Override reason is required when bypassing duplicate protection');
      }
    }

    // Generate permanent, immutable IDs
    const studentId = await identifierService.generateStudentId();
    const fileNumber = await identifierService.generateFileNumber();

    const student = await prisma.student.create({
      data: {
        studentId,
        fileNumber,
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || null,
        lastName: input.lastName.trim(),
        fullNameArabic: input.fullNameArabic?.trim() || null,
        gender: input.gender,
        dateOfBirth: dob,
        placeOfBirth: input.placeOfBirth?.trim() || null,
        nationality: input.nationality?.trim() || null,
        nationalId: input.nationalId?.trim() || null,
        passportNumber: input.passportNumber?.trim() || null,
        religion: input.religion?.trim() || null,
        bloodGroup: input.bloodGroup?.trim() || null,
        medicalNotes: input.medicalNotes?.trim() || null,
        addressLine1: input.addressLine1?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        country: input.country?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        status: 'ACTIVE',
      },
    });

    // Record initial status history transition
    await prisma.studentStatusHistory.create({
      data: {
        studentId: student.id,
        oldStatus: null,
        newStatus: 'ACTIVE',
        reason: dupCheck.isDuplicate ? input.overrideReason || 'Registration with duplicate override' : 'Initial registration',
        changedBy: `${user.role}:${user.userId}`,
      },
    });

    // Audit log
    await auditService.log({
      entityType: 'STUDENT',
      entityId: student.id,
      action: dupCheck.isDuplicate ? 'DUPLICATE_OVERRIDE_CREATE' : 'CREATE',
      actor: `${user.role}:${user.userId}`,
      reason: dupCheck.isDuplicate ? input.overrideReason : 'New student registration',
      details: {
        studentId: student.studentId,
        fileNumber: student.fileNumber,
        name: `${student.firstName} ${student.lastName}`,
        wasDuplicateOverride: dupCheck.isDuplicate,
      },
    });

    return student;
  },

  /**
   * Update Student Master Record (preserves studentId and fileNumber)
   */
  async updateStudent(id: string, input: UpdateStudentInput, user: UserContext) {
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Student with ID '${id}' not found`);
    }

    this.validateNationalId(input.nationalId);

    const newFirstName = input.firstName?.trim() ?? existing.firstName;
    const newLastName = input.lastName?.trim() ?? existing.lastName;
    const newDob = input.dateOfBirth ? new Date(input.dateOfBirth) : existing.dateOfBirth;
    const newNationalId = input.nationalId !== undefined ? input.nationalId?.trim() || null : existing.nationalId;

    // Check duplicate if key identity fields are modified
    if (
      newFirstName !== existing.firstName ||
      newLastName !== existing.lastName ||
      newDob.getTime() !== existing.dateOfBirth.getTime() ||
      newNationalId !== existing.nationalId
    ) {
      const dupCheck = await duplicateProtectionService.checkDuplicate({
        firstName: newFirstName,
        lastName: newLastName,
        dateOfBirth: newDob,
        nationalId: newNationalId,
        excludeStudentId: existing.id,
      });

      if (dupCheck.isDuplicate) {
        if (!input.overrideDuplicate) {
          throw new ConflictError(dupCheck.matchReason || 'Duplicate student record detected on update', {
            isDuplicate: true,
            matches: dupCheck.matches,
          });
        }

        if (!user.permissions.includes(PERMISSIONS.STUDENT_OVERRIDE_DUPLICATE)) {
          throw new AuthorizationError('Permission denied: Missing student:override_duplicate permission');
        }

        if (!input.overrideReason?.trim()) {
          throw new ValidationError('Override reason is required when bypassing duplicate protection');
        }
      }
    }

    // Build diff for sensitive field audit logging (Old Value vs New Value)
    const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};
    if (input.firstName && input.firstName.trim() !== existing.firstName) {
      changes.firstName = { oldValue: existing.firstName, newValue: input.firstName.trim() };
    }
    if (input.lastName && input.lastName.trim() !== existing.lastName) {
      changes.lastName = { oldValue: existing.lastName, newValue: input.lastName.trim() };
    }
    if (input.dateOfBirth && newDob.getTime() !== existing.dateOfBirth.getTime()) {
      changes.dateOfBirth = { oldValue: existing.dateOfBirth.toISOString(), newValue: newDob.toISOString() };
    }
    if (input.nationalId !== undefined && newNationalId !== existing.nationalId) {
      changes.nationalId = { oldValue: existing.nationalId, newValue: newNationalId };
    }
    if (input.passportNumber !== undefined && (input.passportNumber?.trim() || null) !== existing.passportNumber) {
      changes.passportNumber = { oldValue: existing.passportNumber, newValue: input.passportNumber?.trim() || null };
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        firstName: newFirstName,
        middleName: input.middleName !== undefined ? input.middleName?.trim() || null : existing.middleName,
        lastName: newLastName,
        fullNameArabic: input.fullNameArabic !== undefined ? input.fullNameArabic?.trim() || null : existing.fullNameArabic,
        gender: input.gender ?? (existing.gender as 'MALE' | 'FEMALE'),
        dateOfBirth: newDob,
        placeOfBirth: input.placeOfBirth !== undefined ? input.placeOfBirth?.trim() || null : existing.placeOfBirth,
        nationality: input.nationality !== undefined ? input.nationality?.trim() || null : existing.nationality,
        nationalId: newNationalId,
        passportNumber: input.passportNumber !== undefined ? input.passportNumber?.trim() || null : existing.passportNumber,
        religion: input.religion !== undefined ? input.religion?.trim() || null : existing.religion,
        bloodGroup: input.bloodGroup !== undefined ? input.bloodGroup?.trim() || null : existing.bloodGroup,
        medicalNotes: input.medicalNotes !== undefined ? input.medicalNotes?.trim() || null : existing.medicalNotes,
        addressLine1: input.addressLine1 !== undefined ? input.addressLine1?.trim() || null : existing.addressLine1,
        city: input.city !== undefined ? input.city?.trim() || null : existing.city,
        state: input.state !== undefined ? input.state?.trim() || null : existing.state,
        postalCode: input.postalCode !== undefined ? input.postalCode?.trim() || null : existing.postalCode,
        country: input.country !== undefined ? input.country?.trim() || null : existing.country,
        phone: input.phone !== undefined ? input.phone?.trim() || null : existing.phone,
        email: input.email !== undefined ? input.email?.trim() || null : existing.email,
      },
    });

    await auditService.log({
      entityType: 'STUDENT',
      entityId: updated.id,
      action: 'UPDATE',
      actor: `${user.role}:${user.userId}`,
      reason: input.overrideReason || 'Updated student master record',
      details: {
        studentId: updated.studentId,
        updatedFields: Object.keys(input),
        changes, // Contains Old Value & New Value for changed fields
      },
    });

    return updated;
  },

  /**
   * Change Student Master Status (Records historical transition)
   */
  async changeStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'SUSPENDED', reason: string, user: UserContext) {
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Student with ID '${id}' not found`);
    }

    if (!reason?.trim()) {
      throw new ValidationError('Reason is required for changing student status');
    }

    const updated = await prisma.student.update({
      where: { id },
      data: { status },
    });

    // Save historical status transition
    await prisma.studentStatusHistory.create({
      data: {
        studentId: updated.id,
        oldStatus: existing.status,
        newStatus: status,
        reason: reason.trim(),
        changedBy: `${user.role}:${user.userId}`,
      },
    });

    await auditService.log({
      entityType: 'STUDENT',
      entityId: updated.id,
      action: 'STATUS_CHANGE',
      actor: `${user.role}:${user.userId}`,
      reason,
      details: {
        oldStatus: existing.status,
        newStatus: status,
      },
    });

    return updated;
  },

  /**
   * Get Student Status History Transitions
   */
  async getStatusHistory(id: string) {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundError(`Student with ID '${id}' not found`);
    }

    return prisma.studentStatusHistory.findMany({
      where: { studentId: id },
      orderBy: { changedAt: 'desc' },
    });
  },

  /**
   * Soft-Archive Student Record to prevent physical deletion from destroying academic history
   */
  async archiveStudent(id: string, reason: string, user: UserContext) {
    return this.changeStatus(id, 'ARCHIVED', reason || 'Student record archived for historical preservation', user);
  },

  /**
   * Get single Student by DB ID or System Student ID
   */
  async getStudentById(idOrStudentId: string) {
    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: idOrStudentId }, { studentId: idOrStudentId }],
      },
      include: {
        documents: true,
      },
    });

    if (!student) {
      throw new NotFoundError(`Student record '${idOrStudentId}' not found`);
    }

    return student;
  },

  /**
   * Search and filter students
   */
  async searchStudents(filter: StudentSearchFilter = {}) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.query?.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { studentId: { contains: q } },
        { fileNumber: { contains: q } },
        { nationalId: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
