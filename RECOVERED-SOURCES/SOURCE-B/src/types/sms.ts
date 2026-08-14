export type Role = 'SUPER_ADMIN' | 'ACADEMIC_ADMIN' | 'SCHOOL_HEAD' | 'TEACHER' | 'VIEWER';

export interface UserContext {
  userId: string;
  userName: string;
  role: Role;
  permissions: string[];
}

export interface AcademicYear {
  id: string;
  code: string; // e.g. "2025/2026"
  name: string; // e.g. "Academic Year 2025/2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicStage {
  id: string;
  code: string; // e.g. "BABY", "KG", "PRIMARY", "PREP", "SEC"
  name: string; // e.g. "Baby Class", "KG", "Primary", "Preparatory", "Secondary"
  sequence: number; // 1, 2, 3, 4, 5
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  stageId: string;
  code: string; // e.g. "KG1", "P1", "SEC3"
  name: string; // e.g. "KG 1", "Grade 1"
  sequence: number; // Order within stage or globally
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassRoom {
  id: string;
  gradeId: string;
  code: string; // e.g. "P1-A", "SEC1-B"
  name: string; // e.g. "Class 1-A"
  capacity: number;
  currentEnrollmentCount: number; // Integration metric
  isActive: boolean;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface CapacityOverrideLog {
  id: string;
  classId: string;
  previousCapacity: number;
  requestedCapacity: number;
  approvedByUserId: string;
  approvedByUserName: string;
  reason: string;
  timestamp: string;
}

export interface AuditRecord {
  id: string;
  userId: string;
  userName: string;
  entity: 'ACADEMIC_YEAR' | 'ACADEMIC_STAGE' | 'GRADE' | 'CLASS' | 'STUDENT' | 'CAPACITY_OVERRIDE' | 'ENROLLMENT' | 'STUDENT_TRANSFER';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'ACTIVATE' | 'DEACTIVATE' | 'CLOSE' | 'OVERRIDE_CAPACITY' | 'SEED' | 'ENROLL' | 'UPDATE_STATUS' | 'UPDATE_RESULT' | 'REQUEST_TRANSFER' | 'REVIEW_TRANSFER' | 'APPROVE_TRANSFER' | 'REJECT_TRANSFER' | 'CANCEL_TRANSFER' | 'EXECUTE_TRANSFER';
  oldValue?: string;
  newValue?: string;
  reason?: string;
  timestamp: string;
}

// Module 01 - Student Master Data
export interface Student {
  id: string;
  fileNumber: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  currentClassId?: string;
  currentGradeId?: string;
  currentStageId?: string;
  currentAcademicYearId?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Module 02 - Parent / Guardian
export interface Parent {
  id: string;
  nationalId: string;
  fullName: string;
  email: string;
  phone: string;
  relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  createdAt: string;
  updatedAt: string;
}

// Academic Path Progression Types
export interface PathValidationRequest {
  fromGradeId: string;
  toGradeId: string;
}

export interface PathValidationResult {
  isValid: boolean;
  reason?: string;
  fromStageName?: string;
  toStageName?: string;
  fromGradeName?: string;
  toGradeName?: string;
}

// Module 04 - Student Enrollment
export type AdmissionType = 'NEW' | 'CONTINUING' | 'TRANSFER_IN' | 'RETURNING';
export type EnrollmentStatus = 'ACTIVE' | 'WITHDRAWN' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';
export type AcademicResult = 'PENDING' | 'PASS' | 'FAIL' | 'REPEATING';

export interface StudentEnrollment {
  id: string;
  studentId: string;
  academicYearId: string;
  stageId: string;
  gradeId: string;
  classId: string;
  admissionType: AdmissionType;
  status: EnrollmentStatus;
  academicResult: AcademicResult;
  transferOrigin?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched presentation fields
  studentName?: string;
  fileNumber?: string;
  nationalId?: string;
  academicYearCode?: string;
  stageName?: string;
  gradeName?: string;
  className?: string;
}

export interface CreateEnrollmentRequest {
  studentId: string;
  academicYearId: string;
  stageId: string;
  gradeId: string;
  classId: string;
  admissionType: AdmissionType;
  transferOrigin?: string;
  isAdministrativeOverride?: boolean;
  overrideReason?: string;
}

// Module 05 - Student Transfers
export type TransferType = 'INTERNAL' | 'EXTERNAL';
export type TransferStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'CANCELLED';

export interface StudentTransfer {
  id: string;
  transferNumber: string;
  studentId: string;
  transferType: TransferType;
  status: TransferStatus;
  sourceAcademicYearId: string;
  sourceStageId: string;
  sourceGradeId: string;
  sourceClassId: string;
  sourceEnrollmentId: string;
  targetStageId?: string;
  targetGradeId?: string;
  targetClassId?: string;
  destinationSchoolName?: string;
  destinationDetails?: string;
  reason: string;
  effectiveDate: string;
  requestedByUserId: string;
  reviewedByUserId?: string;
  approvedByUserId?: string;
  executedByUserId?: string;
  rejectionReason?: string;
  isCapacityOverride?: boolean;
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;

  // Presentation fields
  studentName?: string;
  fileNumber?: string;
  nationalId?: string;
  sourceStageName?: string;
  sourceGradeName?: string;
  sourceClassName?: string;
  targetStageName?: string;
  targetGradeName?: string;
  targetClassName?: string;
  sourceAcademicYearCode?: string;
  requestedByUserName?: string;
  approvedByUserName?: string;
}

export interface CreateTransferRequest {
  studentId: string;
  transferType: TransferType;
  targetStageId?: string;
  targetGradeId?: string;
  targetClassId?: string;
  destinationSchoolName?: string;
  destinationDetails?: string;
  reason: string;
  effectiveDate: string;
}

export interface UpdateTransferStatusRequest {
  status: TransferStatus;
  reason?: string;
}

export interface ExecuteTransferRequest {
  isCapacityOverride?: boolean;
  overrideReason?: string;
}

// Permissions Constants
export const SMS_PERMISSIONS = {
  VIEW_ACADEMIC_STRUCTURE: 'academic_structure:view',
  CREATE_ACADEMIC_STRUCTURE: 'academic_structure:create',
  UPDATE_ACADEMIC_STRUCTURE: 'academic_structure:update',
  ACTIVATE_ACADEMIC_STRUCTURE: 'academic_structure:activate',
  CLOSE_ACADEMIC_YEAR: 'academic_year:close',
  CHANGE_CAPACITY: 'capacity:change',
  ADMIN_OVERRIDE_CAPACITY: 'capacity:admin_override',
  VIEW_STUDENTS: 'students:view',
  MANAGE_STUDENTS: 'students:manage',
  VIEW_AUDIT: 'audit:view',
  CREATE_ENROLLMENT: 'enrollment:create',
  VIEW_ENROLLMENT: 'enrollment:view',
  UPDATE_ENROLLMENT: 'enrollment:update',
  VIEW_TRANSFER: 'transfer:view',
  REQUEST_TRANSFER: 'transfer:request',
  REVIEW_TRANSFER: 'transfer:review',
  APPROVE_TRANSFER: 'transfer:approve',
  EXECUTE_TRANSFER: 'transfer:execute',
};
