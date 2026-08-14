/**
 * SMS — Student Master Duplicate Protection Service
 */

import { prisma } from '../db/prisma.js';

export interface StudentDuplicateCheckInput {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | string;
  nationalId?: string | null;
  excludeStudentId?: string; // For updates
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchReason?: string;
  matches: Array<{
    id: string;
    studentId: string;
    fileNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    nationalId?: string | null;
  }>;
}

export const duplicateProtectionService = {
  async checkDuplicate(input: StudentDuplicateCheckInput): Promise<DuplicateCheckResult> {
    const dob = typeof input.dateOfBirth === 'string' ? new Date(input.dateOfBirth) : input.dateOfBirth;

    // Check 1: National ID exact match
    if (input.nationalId && input.nationalId.trim() !== '') {
      const nationalIdMatch = await prisma.student.findFirst({
        where: {
          nationalId: input.nationalId.trim(),
          ...(input.excludeStudentId ? { id: { not: input.excludeStudentId } } : {}),
        },
      });

      if (nationalIdMatch) {
        return {
          isDuplicate: true,
          matchReason: `Matching National/Civil ID found: ${input.nationalId.trim()}`,
          matches: [nationalIdMatch],
        };
      }
    }

    // Check 2: Combination of First Name + Last Name + Date of Birth
    const nameDobMatches = await prisma.student.findMany({
      where: {
        firstName: { equals: input.firstName.trim() },
        lastName: { equals: input.lastName.trim() },
        dateOfBirth: {
          gte: new Date(dob.getFullYear(), dob.getMonth(), dob.getDate()),
          lt: new Date(dob.getFullYear(), dob.getMonth(), dob.getDate() + 1),
        },
        ...(input.excludeStudentId ? { id: { not: input.excludeStudentId } } : {}),
      },
    });

    if (nameDobMatches.length > 0) {
      return {
        isDuplicate: true,
        matchReason: `Student with identical Name (${input.firstName} ${input.lastName}) and Date of Birth (${dob.toISOString().split('T')[0]}) already exists.`,
        matches: nameDobMatches,
      };
    }

    return {
      isDuplicate: false,
      matches: [],
    };
  },
};
