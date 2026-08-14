import { SMSDatabase } from '../services/smsDb';
import { UserContext, SMS_PERMISSIONS } from '../types/sms';

export const createTestUser = (role: UserContext['role'], permissions: string[] = []): UserContext => ({
  userId: 'USR-TEST-' + role,
  userName: 'Test User ' + role,
  role,
  permissions,
});

export interface TestResult {
  code: string;
  name: string;
  passed: boolean;
  message: string;
  realDb: boolean;
  error?: string;
}

export const testSmsDb = new SMSDatabase('file:data/test_sms.db');

export class SMSModule05TestSuite {
  public async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    const superAdminUser = createTestUser('SUPER_ADMIN', Object.values(SMS_PERMISSIONS));
    const adminUser = createTestUser('ACADEMIC_ADMIN', Object.values(SMS_PERMISSIONS));
    const teacherUser = createTestUser('TEACHER', [SMS_PERMISSIONS.VIEW_TRANSFER, SMS_PERMISSIONS.REQUEST_TRANSFER]);
    const unauthorizedUser = createTestUser('VIEWER', [SMS_PERMISSIONS.VIEW_TRANSFER]);

    // Reset test DB to baseline seed
    await testSmsDb.resetDatabase();

    // Helper setup: create an active academic year, stage, 2 grades, 2 classes, parent, and 2 enrolled students
    let student1Id = '';
    let student2Id = '';
    let activeYearId = '';
    let stage1Id = '';
    let grade1Id = '';
    let grade2Id = '';
    let class1Id = '';
    let class2Id = '';
    let classFullId = '';

    let setupError = '';
    try {
      const year = await testSmsDb.createAcademicYear(adminUser, {
        code: '2027/2028',
        name: 'Academic Year 2027/2028',
        startDate: '2027-09-01',
        endDate: '2028-06-30',
        isActive: true,
      });
      activeYearId = year.id;

      const stage = await testSmsDb.createAcademicStage(adminUser, {
        code: 'SECTEST',
        name: 'Secondary Stage Test',
        sequence: 100,
      });
      stage1Id = stage.id;

      const grade1 = await testSmsDb.createGrade(adminUser, {
        stageId: stage.id,
        code: 'G10TST',
        name: 'Grade 10 Test',
        sequence: 100,
      });
      grade1Id = grade1.id;

      const grade2 = await testSmsDb.createGrade(adminUser, {
        stageId: stage.id,
        code: 'G11TST',
        name: 'Grade 11 Test',
        sequence: 101,
      });
      grade2Id = grade2.id;

      const class1 = await testSmsDb.createClass(adminUser, {
        gradeId: grade1.id,
        code: '10A-TST',
        name: 'Class 10-A Test',
        capacity: 25,
      });
      class1Id = class1.id;

      const class2 = await testSmsDb.createClass(adminUser, {
        gradeId: grade1.id,
        code: '10B-TST',
        name: 'Class 10-B Test',
        capacity: 25,
      });
      class2Id = class2.id;

      const classFull = await testSmsDb.createClass(adminUser, {
        gradeId: grade1.id,
        code: '10F-TST',
        name: 'Class 10-FULL Test',
        capacity: 1,
      });
      classFullId = classFull.id;

      const parent = await testSmsDb.createParent(adminUser, {
        nationalId: '29001010000099',
        fullName: 'Parent Test One',
        email: 'parenttest1@sms.edu',
        phone: '+201000000099',
        relationship: 'FATHER',
      });

      const s1 = await testSmsDb.createStudent(adminUser, {
        fileNumber: 'STU-2027-001',
        nationalId: '30501010000091',
        firstName: 'Ahmed',
        lastName: 'Ali',
        gender: 'MALE',
        dateOfBirth: '2009-05-15',
        parentId: parent.id,
        currentStageId: stage1Id,
        currentGradeId: grade1Id,
        currentClassId: class1Id,
        currentAcademicYearId: activeYearId,
      });
      student1Id = s1.id;

      const s2 = await testSmsDb.createStudent(adminUser, {
        fileNumber: 'STU-2027-002',
        nationalId: '30501010000092',
        firstName: 'Mona',
        lastName: 'Hassan',
        gender: 'FEMALE',
        dateOfBirth: '2009-08-20',
        parentId: parent.id,
        currentStageId: stage1Id,
        currentGradeId: grade1Id,
        currentClassId: classFullId,
        currentAcademicYearId: activeYearId,
      });
      student2Id = s2.id;

      // Enroll student 1 into Class 10-A
      await testSmsDb.createEnrollment(adminUser, {
        studentId: student1Id,
        academicYearId: activeYearId,
        stageId: stage1Id,
        gradeId: grade1Id,
        classId: class1Id,
        admissionType: 'NEW',
      });

      // Enroll student 2 into Class 10-FULL (to make it full)
      await testSmsDb.createEnrollment(adminUser, {
        studentId: student2Id,
        academicYearId: activeYearId,
        stageId: stage1Id,
        gradeId: grade1Id,
        classId: classFullId,
        admissionType: 'NEW',
      });
    } catch (err: any) {
      setupError = err instanceof Error ? err.message : String(err);
      console.error('Setup failed:', err);
    }

    // -------------------------------------------------------------
    // C-31: Internal Transfer Request Validation
    // -------------------------------------------------------------
    try {
      if (setupError) {
        throw new Error(`Test setup failed: ${setupError}`);
      }
      // Test missing target structure
      let blockedMissingTarget = false;
      try {
        await testSmsDb.createTransferRequest(teacherUser, {
          studentId: student1Id,
          transferType: 'INTERNAL',
          reason: 'Requesting section change for scheduling reasons',
          effectiveDate: '2025-10-01',
        });
      } catch (e) {
        blockedMissingTarget = true;
      }

      // Test valid internal request
      const req1 = await testSmsDb.createTransferRequest(teacherUser, {
        studentId: student1Id,
        transferType: 'INTERNAL',
        targetStageId: stage1Id,
        targetGradeId: grade1Id,
        targetClassId: class2Id,
        reason: 'Requesting section change from 10-A to 10-B',
        effectiveDate: '2025-10-01',
      });

      if (blockedMissingTarget && req1.status === 'PENDING' && req1.transferType === 'INTERNAL') {
        results.push({
          code: 'C-31',
          name: 'Internal Transfer Request Validation',
          passed: true,
          message: 'Passed: Target structure validation enforced and pending internal transfer created successfully.',
          realDb: true,
        });
      } else {
        results.push({
          code: 'C-31',
          name: 'Internal Transfer Request Validation',
          passed: false,
          message: 'Failed: Internal transfer request validation did not meet criteria.',
          realDb: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-31',
        name: 'Internal Transfer Request Validation',
        passed: false,
        message: 'Failed with error: ' + msg,
        realDb: true,
      });
    }

    // -------------------------------------------------------------
    // C-32: Single Active Transfer Request Constraint
    // -------------------------------------------------------------
    try {
      await testSmsDb.createTransferRequest(teacherUser, {
        studentId: student1Id,
        transferType: 'EXTERNAL',
        destinationSchoolName: 'New International School',
        reason: 'Duplicate request attempt',
        effectiveDate: '2025-10-01',
      });
      results.push({
        code: 'C-32',
        name: 'Single Active Transfer Request Constraint',
        passed: false,
        message: 'Failed: Allowed duplicate active transfer request for student.',
        realDb: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-32',
        name: 'Single Active Transfer Request Constraint',
        passed: true,
        message: 'Passed: Blocked duplicate transfer request for student with active request: ' + msg,
        realDb: true,
      });
    }

    // -------------------------------------------------------------
    // C-33: External Transfer Request Validation
    // -------------------------------------------------------------
    try {
      let shortNameBlocked = false;
      try {
        await testSmsDb.createTransferRequest(teacherUser, {
          studentId: student2Id,
          transferType: 'EXTERNAL',
          destinationSchoolName: 'AB', // < 3 chars
          reason: 'Family relocation to another city',
          effectiveDate: '2025-10-01',
        });
      } catch (e) {
        shortNameBlocked = true;
      }

      const req2 = await testSmsDb.createTransferRequest(teacherUser, {
        studentId: student2Id,
        transferType: 'EXTERNAL',
        destinationSchoolName: 'St. George Academy',
        reason: 'Family relocation to another city',
        effectiveDate: '2025-10-01',
      });

      if (shortNameBlocked && req2.destinationSchoolName === 'St. George Academy') {
        results.push({
          code: 'C-33',
          name: 'External Transfer Request Validation',
          passed: true,
          message: 'Passed: Destination school name validation enforced and external transfer created.',
          realDb: true,
        });
      } else {
        results.push({
          code: 'C-33',
          name: 'External Transfer Request Validation',
          passed: false,
          message: 'Failed: External transfer validation criteria not met.',
          realDb: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-33',
        name: 'External Transfer Request Validation',
        passed: false,
        message: 'Failed with error: ' + msg,
        realDb: true,
      });
    }

    // -------------------------------------------------------------
    // C-34: Transfer Lifecycle State Machine
    // -------------------------------------------------------------
    try {
      const activeTransfers = await testSmsDb.getTransfers({ studentId: student1Id });
      const t1 = activeTransfers[0];

      // PENDING -> UNDER_REVIEW
      const rev = await testSmsDb.updateTransferStatus(adminUser, t1.id, 'UNDER_REVIEW');
      // UNDER_REVIEW -> APPROVED
      const app = await testSmsDb.updateTransferStatus(adminUser, t1.id, 'APPROVED');

      if (rev.status === 'UNDER_REVIEW' && app.status === 'APPROVED') {
        results.push({
          code: 'C-34',
          name: 'Transfer Lifecycle State Machine',
          passed: true,
          message: 'Passed: State transitions PENDING -> UNDER_REVIEW -> APPROVED executed cleanly.',
          realDb: true,
        });
      } else {
        results.push({
          code: 'C-34',
          name: 'Transfer Lifecycle State Machine',
          passed: false,
          message: `Failed: Unexpected statuses: ${rev.status}, ${app.status}`,
          realDb: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-34',
        name: 'Transfer Lifecycle State Machine',
        passed: false,
        message: 'Failed with error: ' + msg,
        realDb: true,
      });
    }

    // -------------------------------------------------------------
    // C-35: Internal Transfer Execution & Atomic Placement Update
    // -------------------------------------------------------------
    try {
      const activeTransfers = await testSmsDb.getTransfers({ studentId: student1Id });
      const t1 = activeTransfers[0];

      const executed = await testSmsDb.executeTransfer(adminUser, t1.id);

      // Verify source enrollment is WITHDRAWN
      const enrs = await testSmsDb.getEnrollments({ studentId: student1Id });
      const withdrawnEnr = enrs.find((e) => e.id === t1.sourceEnrollmentId);
      const activeEnr = enrs.find((e) => e.status === 'ACTIVE');

      // Verify student placement
      const student = (await testSmsDb.getStudents()).find((s) => s.id === student1Id);

      if (
        executed.status === 'EXECUTED' &&
        withdrawnEnr?.status === 'WITHDRAWN' &&
        activeEnr?.classId === class2Id &&
        activeEnr?.admissionType === 'TRANSFER_IN' &&
        student?.currentClassId === class2Id
      ) {
        results.push({
          code: 'C-35',
          name: 'Internal Transfer Execution & Atomic Placement Update',
          passed: true,
          message: 'Passed: Source enrollment WITHDRAWN, new TRANSFER_IN enrollment ACTIVE, student placement updated.',
          realDb: true,
        });
      } else {
        results.push({
          code: 'C-35',
          name: 'Internal Transfer Execution & Atomic Placement Update',
          passed: false,
          message: 'Failed: Internal transfer execution verification failed.',
          realDb: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-35',
        name: 'Internal Transfer Execution & Atomic Placement Update',
        passed: false,
        message: 'Failed with error: ' + msg,
        realDb: true,
      });
    }

    // -------------------------------------------------------------
    // C-36: Capacity Override Enforcement on Full Class
    // -------------------------------------------------------------
    try {
      // Create transfer for Student 1 to Class 10-FULL (which has capacity 1 and is currently full)
      const tFullReq = await testSmsDb.createTransferRequest(adminUser, {
        studentId: student1Id,
        transferType: 'INTERNAL',
        targetStageId: stage1Id,
        targetGradeId: grade1Id,
        targetClassId: classFullId,
        reason: 'Transferring into full class',
        effectiveDate: '2025-10-01',
      });

      await testSmsDb.updateTransferStatus(adminUser, tFullReq.id, 'APPROVED');

      // Attempt execution without override -> should throw
      let blockedWithoutOverride = false;
      try {
        await testSmsDb.executeTransfer(adminUser, tFullReq.id);
      } catch (e) {
        blockedWithoutOverride = true;
      }

      // Execute with valid capacity override
      const executedWithOverride = await testSmsDb.executeTransfer(adminUser, tFullReq.id, {
        isCapacityOverride: true,
        overrideReason: 'Approved by Academic Director due to sibling priority',
      });

      if (blockedWithoutOverride && executedWithOverride.status === 'EXECUTED' && executedWithOverride.isCapacityOverride) {
        results.push({
          code: 'C-36',
          name: 'Capacity Override Enforcement on Full Class',
          passed: true,
          message: 'Passed: Over-capacity execution blocked without override, succeeded with valid administrative override.',
          realDb: true,
        });
      } else {
        results.push({
          code: 'C-36',
          name: 'Capacity Override Enforcement on Full Class',
          passed: false,
          message: 'Failed: Capacity override enforcement failed criteria.',
          realDb: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-36',
        name: 'Capacity Override Enforcement on Full Class',
        passed: false,
        message: 'Failed with error: ' + msg,
        realDb: true,
      });
    }

    // -------------------------------------------------------------
    // C-37: External Transfer Execution & Student Deactivation
    // -------------------------------------------------------------
    try {
      const extTransfers = await testSmsDb.getTransfers({ studentId: student2Id });
      const t2 = extTransfers[0];

      await testSmsDb.updateTransferStatus(adminUser, t2.id, 'APPROVED');
      const execExt = await testSmsDb.executeTransfer(adminUser, t2.id);

      const student2 = (await testSmsDb.getStudents()).find((s) => s.id === student2Id);
      const enrs2 = await testSmsDb.getEnrollments({ studentId: student2Id });
      const activeEnr2 = enrs2.filter((e) => e.status === 'ACTIVE');

      if (execExt.status === 'EXECUTED' && student2?.isActive === false && activeEnr2.length === 0) {
        results.push({
          code: 'C-37',
          name: 'External Transfer Execution & Student Deactivation',
          passed: true,
          message: 'Passed: Source enrollment WITHDRAWN, student deactivated (is_active = false), placement cleared.',
          realDb: true,
        });
      } else {
        results.push({
          code: 'C-37',
          name: 'External Transfer Execution & Student Deactivation',
          passed: false,
          message: 'Failed: External transfer execution verification failed.',
          realDb: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-37',
        name: 'External Transfer Execution & Student Deactivation',
        passed: false,
        message: 'Failed with error: ' + msg,
        realDb: true,
      });
    }

    // -------------------------------------------------------------
    // C-38: Role & Permission Enforcement
    // -------------------------------------------------------------
    try {
      let blockedUnauth = false;
      try {
        await testSmsDb.createTransferRequest(unauthorizedUser, {
          studentId: student1Id,
          transferType: 'INTERNAL',
          targetStageId: stage1Id,
          targetGradeId: grade1Id,
          targetClassId: class1Id,
          reason: 'Unauthorized request',
          effectiveDate: '2025-10-01',
        });
      } catch (e) {
        blockedUnauth = true;
      }

      if (blockedUnauth) {
        results.push({
          code: 'C-38',
          name: 'Role & Permission Enforcement',
          passed: true,
          message: 'Passed: Unauthorized user blocked from requesting transfer (E-20 violation enforced).',
          realDb: true,
        });
      } else {
        results.push({
          code: 'C-38',
          name: 'Role & Permission Enforcement',
          passed: false,
          message: 'Failed: Unauthorized user was permitted to create transfer request.',
          realDb: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-38',
        name: 'Role & Permission Enforcement',
        passed: false,
        message: 'Failed with error: ' + msg,
        realDb: true,
      });
    }

    // -------------------------------------------------------------
    // C-39: Transfer Audit Logging Integrity
    // -------------------------------------------------------------
    try {
      const auditTrail = await testSmsDb.getAuditTrail();
      const transferAudits = auditTrail.filter((a) => a.entity === 'STUDENT_TRANSFER');

      if (transferAudits.length >= 4) {
        results.push({
          code: 'C-39',
          name: 'Transfer Audit Logging Integrity',
          passed: true,
          message: `Passed: Found ${transferAudits.length} audit trail records for student transfers with complete context.`,
          realDb: true,
        });
      } else {
        results.push({
          code: 'C-39',
          name: 'Transfer Audit Logging Integrity',
          passed: false,
          message: `Failed: Expected >= 4 transfer audit records, found ${transferAudits.length}`,
          realDb: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-39',
        name: 'Transfer Audit Logging Integrity',
        passed: false,
        message: 'Failed with error: ' + msg,
        realDb: true,
      });
    }

    // -------------------------------------------------------------
    // C-40: End-to-End Transfer Lifecycle Verification
    // -------------------------------------------------------------
    try {
      const allPassed = results.every((r) => r.passed);
      if (allPassed) {
        results.push({
          code: 'C-40',
          name: 'End-to-End Transfer Lifecycle Verification',
          passed: true,
          message: 'Passed: All Module 05 Student Transfer lifecycle rules, constraints, and audit trails verified.',
          realDb: true,
        });
      } else {
        const failed = results.filter((r) => !r.passed).map((r) => r.code).join(', ');
        results.push({
          code: 'C-40',
          name: 'End-to-End Transfer Lifecycle Verification',
          passed: false,
          message: `Failed: The following prior gates failed: ${failed}`,
          realDb: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        code: 'C-40',
        name: 'End-to-End Transfer Lifecycle Verification',
        passed: false,
        message: 'Failed with error: ' + msg,
        realDb: true,
      });
    }

    return results;
  }
}

export const smsModule05TestSuite = new SMSModule05TestSuite();
