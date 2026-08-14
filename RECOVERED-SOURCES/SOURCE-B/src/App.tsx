import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AcademicYearView } from './components/AcademicYearView';
import { StagesGradesView } from './components/StagesGradesView';
import { ClassesView } from './components/ClassesView';
import { PathValidationView } from './components/PathValidationView';
import { HierarchyTreeView } from './components/HierarchyTreeView';
import { AuditTrailView } from './components/AuditTrailView';
import { TestRunnerView } from './components/TestRunnerView';
import { RegressionView } from './components/RegressionView';
import { EnrollmentView } from './components/EnrollmentView';
import { TransferView } from './components/TransferView';

import {
  UserContext,
  Role,
  AcademicYear,
  AcademicStage,
  Grade,
  ClassRoom,
  AuditRecord,
  Student,
  Parent,
  StudentEnrollment,
  CreateEnrollmentRequest,
  EnrollmentStatus,
  AcademicResult,
  PathValidationResult,
  SMS_PERMISSIONS,
} from './types/sms';

const ROLE_CREDENTIALS: Record<Role, { username: string; password_hash: string }> = {
  SUPER_ADMIN: { username: 'superadmin', password_hash: 'admin123' },
  ACADEMIC_ADMIN: { username: 'acadadmin', password_hash: 'admin123' },
  SCHOOL_HEAD: { username: 'acadadmin', password_hash: 'admin123' },
  TEACHER: { username: 'teacher', password_hash: 'teacher123' },
  VIEWER: { username: 'viewer', password_hash: 'viewer123' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('transfers');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Auth State
  const [authToken, setAuthToken] = useState<string>('');
  const [user, setUser] = useState<UserContext>({
    userId: 'USR-ADMIN-01',
    userName: 'Dr. Sarah Al-Sayed (Academic Director)',
    role: 'SUPER_ADMIN',
    permissions: Object.values(SMS_PERMISSIONS),
  });

  // State
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);

  // Authenticate user on mount or role change
  const loginUserForRole = useCallback(async (role: Role) => {
    try {
      const creds = ROLE_CREDENTIALS[role] || ROLE_CREDENTIALS.SUPER_ADMIN;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: creds.username, password: creds.password_hash }),
      });
      const json = await res.json();
      if (json.success) {
        setAuthToken(json.data.token);
        setUser(json.data.user);
        return json.data.token;
      } else {
        setGlobalError(json.error);
        return '';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGlobalError(msg);
      return '';
    }
  }, []);

  // Fetch Data from Persistent SQLite Database Server
  const fetchData = useCallback(async (tokenToUse?: string) => {
    const token = tokenToUse || authToken;
    if (!token) return;

    try {
      setGlobalError(null);
      const headers = { Authorization: `Bearer ${token}` };

      const [yRes, stgRes, gRes, cRes, audRes, stuRes, parRes, enrRes] = await Promise.all([
        fetch('/api/sms/academic-years', { headers }),
        fetch('/api/sms/stages', { headers }),
        fetch('/api/sms/grades', { headers }),
        fetch('/api/sms/classes', { headers }),
        fetch('/api/sms/audit', { headers }),
        fetch('/api/sms/students', { headers }),
        fetch('/api/sms/parents', { headers }),
        fetch('/api/sms/enrollments', { headers }),
      ]);

      const yData = await yRes.json();
      const stgData = await stgRes.json();
      const gData = await gRes.json();
      const cData = await cRes.json();
      const audData = await audRes.json();
      const stuData = await stuRes.json();
      const parData = await parRes.json();
      const enrData = await enrRes.json();

      if (yData.success) setYears(yData.data);
      if (stgData.success) setStages(stgData.data);
      if (gData.success) setGrades(gData.data);
      if (cData.success) setClasses(cData.data);
      if (audData.success) setAuditRecords(audData.data);
      if (stuData.success) setStudents(stuData.data);
      if (parData.success) setParents(parData.data);
      if (enrData.success) setEnrollments(enrData.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGlobalError(msg);
    }
  }, [authToken]);

  // Initial Auth & Data Load
  useEffect(() => {
    loginUserForRole('SUPER_ADMIN').then((tok) => {
      if (tok) fetchData(tok);
    });
  }, [loginUserForRole, fetchData]);

  // Role Handler
  const handleRoleChange = async (role: Role) => {
    const tok = await loginUserForRole(role);
    if (tok) await fetchData(tok);
  };

  // Seed Reset Handler
  const handleResetSeed = async () => {
    try {
      const res = await fetch('/api/sms/seed/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (!json.success) {
        setGlobalError(json.error);
      } else {
        await fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGlobalError(msg);
    }
  };

  // Handlers for Academic Years
  const handleCreateYear = async (data: { code: string; name: string; startDate: string; endDate: string; isActive?: boolean }) => {
    const res = await fetch('/api/sms/academic-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchData();
  };

  const handleActivateYear = async (id: string) => {
    const res = await fetch(`/api/sms/academic-years/${id}/activate`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const json = await res.json();
    if (!json.success) setGlobalError(json.error);
    await fetchData();
  };

  const handleCloseYear = async (id: string) => {
    const res = await fetch(`/api/sms/academic-years/${id}/close`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const json = await res.json();
    if (!json.success) setGlobalError(json.error);
    await fetchData();
  };

  // Handlers for Stages & Grades
  const handleCreateStage = async (data: { code: string; name: string; sequence: number }) => {
    const res = await fetch('/api/sms/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchData();
  };

  const handleDeleteStage = async (id: string) => {
    const res = await fetch(`/api/sms/stages/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const json = await res.json();
    if (!json.success) setGlobalError(json.error);
    await fetchData();
  };

  const handleCreateGrade = async (data: { stageId: string; code: string; name: string; sequence: number }) => {
    const res = await fetch('/api/sms/grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchData();
  };

  // Handlers for Classes
  const handleCreateClass = async (data: { gradeId: string; code: string; name: string; capacity: number }) => {
    const res = await fetch('/api/sms/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchData();
  };

  const handleChangeCapacity = async (
    classId: string,
    newCapacity: number,
    isAdministrativeOverride = false,
    overrideReason = ''
  ) => {
    const res = await fetch(`/api/sms/classes/${classId}/capacity`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ newCapacity, isAdministrativeOverride, overrideReason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchData();
  };

  // Path Validation
  const handleValidatePath = (fromGradeId: string, toGradeId: string): PathValidationResult => {
    const fromG = grades.find((g) => g.id === fromGradeId);
    const toG = grades.find((g) => g.id === toGradeId);

    if (!fromG || !toG) {
      return { isValid: false, reason: 'Invalid Grade reference provided' };
    }

    const fromS = stages.find((s) => s.id === fromG.stageId);
    const toS = stages.find((s) => s.id === toG.stageId);

    if (!fromS || !toS) {
      return { isValid: false, reason: 'Invalid Stage reference provided' };
    }

    const stageDiff = toS.sequence - fromS.sequence;
    if (stageDiff > 1) {
      return {
        isValid: false,
        reason: `Invalid Stage Jump: Cannot jump directly from '${fromS.name}' to '${toS.name}' (C-14 violation)`,
        fromStageName: fromS.name,
        toStageName: toS.name,
        fromGradeName: fromG.name,
        toGradeName: toG.name,
      };
    }

    if (stageDiff < 0) {
      return {
        isValid: false,
        reason: `Invalid Progression: Backward move from '${fromS.name}' to '${toS.name}' blocked`,
        fromStageName: fromS.name,
        toStageName: toS.name,
      };
    }

    const gradeDiff = toG.sequence - fromG.sequence;
    if (gradeDiff !== 1) {
      return {
        isValid: false,
        reason: `Invalid Grade Progression: Cannot move from '${fromG.name}' (Seq: ${fromG.sequence}) to '${toG.name}' (Seq: ${toG.sequence})`,
        fromStageName: fromS.name,
        toStageName: toS.name,
        fromGradeName: fromG.name,
        toGradeName: toG.name,
      };
    }

    return {
      isValid: true,
      fromStageName: fromS.name,
      toStageName: toS.name,
      fromGradeName: fromG.name,
      toGradeName: toG.name,
    };
  };

  // Module 04 Student Enrollment Handlers
  const handleCreateEnrollment = async (req: CreateEnrollmentRequest) => {
    const res = await fetch('/api/sms/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(req),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchData();
  };

  const handleCreateStudentAndEnroll = async (
    studentData: {
      nationalId: string;
      firstName: string;
      lastName: string;
      gender: 'MALE' | 'FEMALE';
      dateOfBirth: string;
      parentId: string;
    },
    enrollmentReq: Omit<CreateEnrollmentRequest, 'studentId'>
  ) => {
    // 1. Create Student Master Record
    const stuRes = await fetch('/api/sms/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(studentData),
    });
    const stuJson = await stuRes.json();
    if (!stuJson.success) throw new Error(stuJson.error);

    const newStudent = stuJson.data;

    // 2. Create Enrollment for new student
    await handleCreateEnrollment({
      ...enrollmentReq,
      studentId: newStudent.id,
    });
  };

  const handleUpdateStatus = async (enrollmentId: string, status: EnrollmentStatus, reason?: string) => {
    const res = await fetch(`/api/sms/enrollments/${enrollmentId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ status, reason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchData();
  };

  const handleUpdateResult = async (enrollmentId: string, result: AcademicResult) => {
    const res = await fetch(`/api/sms/enrollments/${enrollmentId}/result`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ result }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchData();
  };

  const handleCreateParent = async (parentData: {
    nationalId: string;
    fullName: string;
    email: string;
    phone: string;
    relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  }): Promise<Parent> => {
    const res = await fetch('/api/sms/parents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(parentData),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchData();
    return json.data;
  };

  const handleRunTestSuite = async () => {
    const res = await fetch('/api/sms/test-suite/run', { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  };

  const activeYear = years.find((y) => y.isActive);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        user={user}
        onRoleChange={handleRoleChange}
        activeYear={activeYear}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onResetSeed={handleResetSeed}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {globalError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center justify-between">
            <span>{globalError}</span>
            <button onClick={() => setGlobalError(null)} className="text-rose-400 font-bold ml-4 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {activeTab === 'transfers' && (
          <TransferView
            user={user}
            authToken={authToken}
            years={years}
            stages={stages}
            grades={grades}
            classes={classes}
            students={students}
            onRefreshData={fetchData}
          />
        )}

        {activeTab === 'enrollment' && (
          <EnrollmentView
            enrollments={enrollments}
            students={students}
            parents={parents}
            years={years}
            stages={stages}
            grades={grades}
            classes={classes}
            user={user}
            onCreateEnrollment={handleCreateEnrollment}
            onCreateStudentAndEnroll={handleCreateStudentAndEnroll}
            onUpdateStatus={handleUpdateStatus}
            onUpdateResult={handleUpdateResult}
            onCreateParent={handleCreateParent}
            error={globalError}
          />
        )}

        {activeTab === 'years' && (
          <AcademicYearView
            years={years}
            user={user}
            onCreateYear={handleCreateYear}
            onActivateYear={handleActivateYear}
            onCloseYear={handleCloseYear}
            error={globalError}
          />
        )}

        {activeTab === 'stages' && (
          <StagesGradesView
            stages={stages}
            grades={grades}
            user={user}
            onCreateStage={handleCreateStage}
            onCreateGrade={handleCreateGrade}
            onDeleteStage={handleDeleteStage}
            onDeleteGrade={() => {}}
            error={globalError}
          />
        )}

        {activeTab === 'classes' && (
          <ClassesView
            classes={classes}
            grades={grades}
            user={user}
            onCreateClass={handleCreateClass}
            onChangeCapacity={handleChangeCapacity}
            onDeleteClass={() => {}}
            error={globalError}
          />
        )}

        {activeTab === 'path' && <PathValidationView grades={grades} onValidatePath={handleValidatePath} />}

        {activeTab === 'tree' && <HierarchyTreeView stages={stages} grades={grades} classes={classes} />}

        {activeTab === 'audit' && <AuditTrailView records={auditRecords} />}

        {activeTab === 'tests' && <TestRunnerView onRunTests={handleRunTestSuite} />}

        {activeTab === 'regression' && <RegressionView students={students} parents={parents} />}
      </main>
    </div>
  );
}
