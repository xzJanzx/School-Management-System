/**
 * SMS — Module 02 Parent / Guardian Master & Integration Service
 */

import { prisma } from '../db/prisma.js';
import { auditService } from './auditService.js';
import { identifierService } from './identifierService.js';
import { NotFoundError, ValidationError } from '../errors/AppError.js';
import { UserContext } from '../middleware/auth.js';

export const VALID_RELATIONSHIPS = [
  'FATHER',
  'MOTHER',
  'GRANDFATHER',
  'GRANDMOTHER',
  'BROTHER',
  'SISTER',
  'UNCLE',
  'AUNT',
  'MATERNAL_UNCLE',
  'MATERNAL_AUNT',
  'LEGAL_GUARDIAN',
  'OTHER',
] as const;

export type RelationshipType = (typeof VALID_RELATIONSHIPS)[number];

export interface CreateGuardianInput {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId?: string;
  additionalPhone?: string;
  email?: string;
  address?: string;
  canContact?: boolean;
  preferredContactMethod?: string;
}

export interface UpdateGuardianInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  nationalId?: string;
  additionalPhone?: string;
  email?: string;
  address?: string;
  canContact?: boolean;
  preferredContactMethod?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface LinkGuardianInput {
  guardianId?: string; // Existing Guardian ID if linking existing
  firstName?: string;  // Required if creating new Guardian
  lastName?: string;   // Required if creating new Guardian
  phone?: string;      // Required if creating new Guardian
  nationalId?: string;
  relationship: string;
  relationshipDescription?: string;
  isPrimary?: boolean;
}

export const guardianService = {
  /**
   * Validate National ID format and uniqueness
   */
  async validateNationalId(nationalId?: string | null, currentGuardianId?: string): Promise<string | null> {
    if (!nationalId || !nationalId.trim()) return null;
    const clean = nationalId.trim();

    if (clean.length < 5 || clean.length > 30) {
      throw new ValidationError('National ID must be between 5 and 30 characters');
    }

    const existing = await prisma.guardian.findUnique({
      where: { nationalId: clean },
    });

    if (existing && existing.id !== currentGuardianId) {
      throw new ValidationError(`Guardian with National ID '${clean}' already exists (${existing.guardianId})`);
    }

    return clean;
  },

  /**
   * Create new Guardian Master Record
   */
  async createGuardian(input: CreateGuardianInput, user: UserContext) {
    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      throw new ValidationError('Guardian First Name and Last Name are required');
    }

    if (!input.phone?.trim()) {
      throw new ValidationError('Guardian Primary Phone is required');
    }

    const cleanNationalId = await this.validateNationalId(input.nationalId);
    const guardianId = await identifierService.generateGuardianId();

    const guardian = await prisma.guardian.create({
      data: {
        guardianId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone.trim(),
        nationalId: cleanNationalId,
        additionalPhone: input.additionalPhone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        canContact: input.canContact !== undefined ? Boolean(input.canContact) : true,
        preferredContactMethod: input.preferredContactMethod || 'PHONE',
        status: 'ACTIVE',
      },
    });

    await auditService.log({
      entityType: 'GUARDIAN',
      entityId: guardian.id,
      action: 'GUARDIAN_CREATED',
      actor: `${user.role}:${user.userId}`,
      details: {
        guardianId: guardian.guardianId,
        fullName: `${guardian.firstName} ${guardian.lastName}`,
        phone: guardian.phone,
        nationalId: guardian.nationalId,
      },
    });

    return guardian;
  },

  /**
   * Get single Guardian by DB ID or System Guardian ID
   */
  async getGuardianById(idOrGuardianId: string) {
    const guardian = await prisma.guardian.findFirst({
      where: {
        OR: [{ id: idOrGuardianId }, { guardianId: idOrGuardianId }],
      },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                fileNumber: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundError(`Guardian record '${idOrGuardianId}' not found`);
    }

    return guardian;
  },

  /**
   * Search Guardians by Query
   */
  async searchGuardians(query?: string) {
    if (!query || !query.trim()) {
      return prisma.guardian.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    }

    const q = query.trim();
    return prisma.guardian.findMany({
      where: {
        OR: [
          { guardianId: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { nationalId: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Update Guardian Master Record with sensitive audit log diff
   */
  async updateGuardian(id: string, input: UpdateGuardianInput, user: UserContext) {
    const existing = await prisma.guardian.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Guardian record '${id}' not found`);
    }

    if (input.nationalId !== undefined) {
      await this.validateNationalId(input.nationalId, id);
    }

    // Capture diff for sensitive fields
    const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};
    if (input.firstName && input.firstName.trim() !== existing.firstName) {
      changes.firstName = { oldValue: existing.firstName, newValue: input.firstName.trim() };
    }
    if (input.lastName && input.lastName.trim() !== existing.lastName) {
      changes.lastName = { oldValue: existing.lastName, newValue: input.lastName.trim() };
    }
    if (input.phone && input.phone.trim() !== existing.phone) {
      changes.phone = { oldValue: existing.phone, newValue: input.phone.trim() };
    }
    if (input.nationalId !== undefined && (input.nationalId?.trim() || null) !== existing.nationalId) {
      changes.nationalId = { oldValue: existing.nationalId, newValue: input.nationalId?.trim() || null };
    }

    const updated = await prisma.guardian.update({
      where: { id },
      data: {
        ...(input.firstName ? { firstName: input.firstName.trim() } : {}),
        ...(input.lastName ? { lastName: input.lastName.trim() } : {}),
        ...(input.phone ? { phone: input.phone.trim() } : {}),
        ...(input.nationalId !== undefined ? { nationalId: input.nationalId?.trim() || null } : {}),
        ...(input.additionalPhone !== undefined ? { additionalPhone: input.additionalPhone?.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
        ...(input.canContact !== undefined ? { canContact: Boolean(input.canContact) } : {}),
        ...(input.preferredContactMethod ? { preferredContactMethod: input.preferredContactMethod } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });

    await auditService.log({
      entityType: 'GUARDIAN',
      entityId: updated.id,
      action: 'GUARDIAN_UPDATED',
      actor: `${user.role}:${user.userId}`,
      details: {
        guardianId: updated.guardianId,
        updatedFields: Object.keys(input),
        changes,
      },
    });

    return updated;
  },

  /**
   * Change Guardian Status (ACTIVE / INACTIVE)
   */
  async changeStatus(id: string, status: 'ACTIVE' | 'INACTIVE', user: UserContext) {
    const existing = await prisma.guardian.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Guardian record '${id}' not found`);
    }

    const updated = await prisma.guardian.update({
      where: { id },
      data: { status },
    });

    await auditService.log({
      entityType: 'GUARDIAN',
      entityId: updated.id,
      action: status === 'INACTIVE' ? 'GUARDIAN_DEACTIVATED' : 'GUARDIAN_REACTIVATED',
      actor: `${user.role}:${user.userId}`,
      details: {
        guardianId: updated.guardianId,
        oldStatus: existing.status,
        newStatus: status,
      },
    });

    return updated;
  },

  /**
   * Delete Guardian (Blocked if linked to active students)
   */
  async deleteGuardian(id: string, user: UserContext) {
    const existing = await prisma.guardian.findUnique({
      where: { id },
      include: { students: true },
    });

    if (!existing) {
      throw new NotFoundError(`Guardian record '${id}' not found`);
    }

    if (existing.students.length > 0) {
      throw new ValidationError(
        `Cannot delete Guardian '${existing.guardianId}' because they are linked to ${existing.students.length} student(s). Deactivate the guardian instead.`
      );
    }

    await prisma.guardian.delete({ where: { id } });

    await auditService.log({
      entityType: 'GUARDIAN',
      entityId: id,
      action: 'GUARDIAN_DELETED',
      actor: `${user.role}:${user.userId}`,
      details: { guardianId: existing.guardianId },
    });

    return { success: true };
  },

  /**
   * Link Guardian to Student (Reuses existing Guardian or creates new)
   */
  async linkGuardian(studentId: string, input: LinkGuardianInput, user: UserContext) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundError(`Student record '${studentId}' not found`);
    }

    if (!input.relationship?.trim()) {
      throw new ValidationError('Relationship type is required');
    }

    let targetGuardianId = input.guardianId;

    if (targetGuardianId) {
      const existingG = await prisma.guardian.findFirst({
        where: {
          OR: [{ id: targetGuardianId }, { guardianId: targetGuardianId }],
        },
      });
      if (!existingG) {
        throw new NotFoundError(`Guardian '${targetGuardianId}' not found`);
      }
      targetGuardianId = existingG.id;
    } else {
      // Must provide basic info for new Guardian creation
      if (!input.firstName?.trim() || !input.lastName?.trim()) {
        throw new ValidationError('First name and last name are required when creating a new Guardian');
      }
      if (!input.phone?.trim()) {
        throw new ValidationError('Primary phone is required when creating a new Guardian');
      }

      // Check if existing guardian matched by National ID
      if (input.nationalId?.trim()) {
        const matched = await prisma.guardian.findUnique({
          where: { nationalId: input.nationalId.trim() },
        });
        if (matched) {
          targetGuardianId = matched.id;
        }
      }

      if (!targetGuardianId) {
        const created = await this.createGuardian(
          {
            firstName: input.firstName!,
            lastName: input.lastName!,
            phone: input.phone!,
            nationalId: input.nationalId,
          },
          user
        );
        targetGuardianId = created.id;
      }
    }

    const isPrimary = Boolean(input.isPrimary);

    // Transactional Primary Switch and Link creation
    const link = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        const currentPrimaryList = await tx.studentGuardian.findMany({
          where: {
            studentId,
            isPrimary: true,
            NOT: { guardianId: targetGuardianId },
          },
          include: { guardian: true },
        });

        for (const prev of currentPrimaryList) {
          await tx.studentGuardian.update({
            where: { id: prev.id },
            data: { isPrimary: false },
          });

          await auditService.log(
            {
              entityType: 'STUDENT',
              entityId: studentId,
              action: 'PRIMARY_GUARDIAN_CHANGED',
              actor: `${user.role}:${user.userId}`,
              details: {
                studentId,
                previousPrimaryGuardianId: prev.guardian.guardianId,
                newPrimaryGuardianId: targetGuardianId,
              },
            },
            tx
          );
        }
      }

      return tx.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId,
            guardianId: targetGuardianId,
          },
        },
        create: {
          studentId,
          guardianId: targetGuardianId,
          isPrimary,
          relationship: input.relationship.trim(),
          relationshipDescription: input.relationshipDescription?.trim() || null,
        },
        update: {
          isPrimary,
          relationship: input.relationship.trim(),
          relationshipDescription: input.relationshipDescription?.trim() || null,
        },
        include: {
          guardian: true,
          student: true,
        },
      });
    });

    await auditService.log({
      entityType: 'STUDENT',
      entityId: studentId,
      action: 'STUDENT_GUARDIAN_CREATED',
      actor: `${user.role}:${user.userId}`,
      details: {
        guardianId: link.guardian.guardianId,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
      },
    });

    return link;
  },

  /**
   * Update Student-Guardian Relationship details / Primary status
   */
  async updateRelationship(
    studentId: string,
    guardianId: string,
    input: { relationship?: string; relationshipDescription?: string; isPrimary?: boolean },
    user: UserContext
  ) {
    const existing = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: { studentId, guardianId },
      },
      include: { guardian: true },
    });

    if (!existing) {
      throw new NotFoundError(`Link between student '${studentId}' and guardian '${guardianId}' not found`);
    }

    const isPrimary = input.isPrimary !== undefined ? Boolean(input.isPrimary) : existing.isPrimary;

    const result = await prisma.$transaction(async (tx) => {
      if (isPrimary && !existing.isPrimary) {
        // Clear previous primary guardians for this student
        const currentPrimaryList = await tx.studentGuardian.findMany({
          where: {
            studentId,
            isPrimary: true,
            NOT: { guardianId },
          },
          include: { guardian: true },
        });

        for (const prev of currentPrimaryList) {
          await tx.studentGuardian.update({
            where: { id: prev.id },
            data: { isPrimary: false },
          });

          await auditService.log(
            {
              entityType: 'STUDENT',
              entityId: studentId,
              action: 'PRIMARY_GUARDIAN_CHANGED',
              actor: `${user.role}:${user.userId}`,
              details: {
                studentId,
                previousPrimaryGuardianId: prev.guardian.guardianId,
                newPrimaryGuardianId: existing.guardian.guardianId,
              },
            },
            tx
          );
        }
      }

      return tx.studentGuardian.update({
        where: {
          studentId_guardianId: { studentId, guardianId },
        },
        data: {
          isPrimary,
          ...(input.relationship ? { relationship: input.relationship.trim() } : {}),
          ...(input.relationshipDescription !== undefined
            ? { relationshipDescription: input.relationshipDescription?.trim() || null }
            : {}),
        },
        include: { guardian: true },
      });
    });

    if (input.relationship && input.relationship.trim() !== existing.relationship) {
      await auditService.log({
        entityType: 'STUDENT',
        entityId: studentId,
        action: 'RELATIONSHIP_CHANGED',
        actor: `${user.role}:${user.userId}`,
        details: {
          guardianId: existing.guardian.guardianId,
          oldRelationship: existing.relationship,
          newRelationship: input.relationship.trim(),
        },
      });
    }

    await auditService.log({
      entityType: 'STUDENT',
      entityId: studentId,
      action: 'STUDENT_GUARDIAN_UPDATED',
      actor: `${user.role}:${user.userId}`,
      details: {
        guardianId: existing.guardian.guardianId,
        isPrimary: result.isPrimary,
        relationship: result.relationship,
      },
    });

    return result;
  },

  /**
   * Get Student Guardians
   */
  async getStudentGuardians(studentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundError(`Student record '${studentId}' not found`);
    }

    return prisma.studentGuardian.findMany({
      where: { studentId },
      include: { guardian: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  },

  /**
   * Get Guardian Students
   */
  async getGuardianStudents(guardianId: string) {
    const guardian = await prisma.guardian.findFirst({
      where: { OR: [{ id: guardianId }, { guardianId }] },
    });
    if (!guardian) {
      throw new NotFoundError(`Guardian record '${guardianId}' not found`);
    }

    return prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fileNumber: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  },

  /**
   * Unlink Guardian from Student
   */
  async unlinkGuardian(studentId: string, guardianId: string, user: UserContext) {
    const existing = await prisma.studentGuardian.findUnique({
      where: { studentId_guardianId: { studentId, guardianId } },
      include: { guardian: true },
    });

    if (!existing) {
      throw new NotFoundError(`Guardian link not found for student '${studentId}'`);
    }

    await prisma.studentGuardian.delete({
      where: { studentId_guardianId: { studentId, guardianId } },
    });

    await auditService.log({
      entityType: 'STUDENT',
      entityId: studentId,
      action: 'STUDENT_GUARDIAN_DEACTIVATED',
      actor: `${user.role}:${user.userId}`,
      details: {
        guardianId: existing.guardian.guardianId,
      },
    });

    return { success: true };
  },
};

