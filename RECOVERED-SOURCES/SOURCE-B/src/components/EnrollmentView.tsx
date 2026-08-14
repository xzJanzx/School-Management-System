import React, { useState } from 'react';
import {
  UserContext,
  AcademicYear,
  AcademicStage,
  Grade,
  ClassRoom,
  Student,
  Parent,
  StudentEnrollment,
  AdmissionType,
  EnrollmentStatus,
  AcademicResult,
  CreateEnrollmentRequest,
} from '../types/sms';
import {
  UserCheck,
  UserPlus,
  Search,
  Filter,
  History,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ArrowRightLeft,
  Building2,
  GraduationCap,
  Layers,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface EnrollmentViewProps {
  enrollments: StudentEnrollment[];
  students: Student[];
  parents: Parent[];
  years: AcademicYear[];
  stages: AcademicStage[];
  grades: Grade[];
  classes: ClassRoom[];
  user: UserContext;
  onCreateEnrollment: (req: CreateEnrollmentRequest) => Promise<void>;
  onCreateStudentAndEnroll: (
    studentData: {
      nationalId: string;
      firstName: string;
      lastName: string;
      gender: 'MALE' | 'FEMALE';
      dateOfBirth: string;
      parentId: string;
    },
    enrollmentReq: Omit<CreateEnrollmentRequest, 'studentId'>
  ) => Promise<void>;
  onUpdateStatus: (enrollmentId: string, status: EnrollmentStatus, reason?: string) => Promise<void>;
  onUpdateResult: (enrollmentId: string, result: AcademicResult) => Promise<void>;
  onCreateParent: (parentData: {
    nationalId: string;
    fullName: string;
    email: string;
    phone: string;
    relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  }) => Promise<Parent>;
  error: string | null;
}

export const EnrollmentView: React.FC<EnrollmentViewProps> = ({
  enrollments,
  students,
  parents,
  years,
  stages,
  grades,
  classes,
  user,
  onCreateEnrollment,
  onCreateStudentAndEnroll,
  onUpdateStatus,
  onUpdateResult,
  onCreateParent,
  error,
}) => {
  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [selectedAdmissionFilter, setSelectedAdmissionFilter] = useState<string>('');

  // Modals state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isNewStudentMode, setIsNewStudentMode] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [statusModalEnrollment, setStatusModalEnrollment] = useState<StudentEnrollment | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [newStatus, setNewStatus] = useState<EnrollmentStatus>('ACTIVE');

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [admissionType, setAdmissionType] = useState<AdmissionType>('NEW');
  const [transferOrigin, setTransferOrigin] = useState('');
  const [isAdminOverride, setIsAdminOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // New Student Form State
  const [newNatId, setNewNatId] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newGender, setNewGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [newDob, setNewDob] = useState('2019-01-01');
  const [selectedParentId, setSelectedParentId] = useState('');

  // Quick Parent Modal
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [pNatId, setPNatId] = useState('');
  const [pFullName, setPFullName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pRel, setPRel] = useState<'FATHER' | 'MOTHER' | 'GUARDIAN'>('FATHER');

  // Local Form Action Pending
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Active Academic Year Default
  const activeYear = years.find((y) => y.isActive);

  // Cascading choices
  const filteredGrades = grades.filter((g) => !selectedStageId || g.stageId === selectedStageId);
  const filteredClasses = classes.filter((c) => !selectedGradeId || c.gradeId === selectedGradeId);
  const targetClass = classes.find((c) => c.id === selectedClassId);

  // Capacity Warning
  const isClassAtCapacity = targetClass ? targetClass.currentEnrollmentCount >= targetClass.capacity : false;

  // Filtered Enrollments
  const filteredEnrollments = enrollments.filter((e) => {
    const matchesSearch =
      !searchTerm ||
      (e.studentName && e.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.fileNumber && e.fileNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.nationalId && e.nationalId.includes(searchTerm));

    const matchesYear = !selectedYearFilter || e.academicYearId === selectedYearFilter;
    const matchesClass = !selectedClassFilter || e.classId === selectedClassFilter;
    const matchesStatus = !selectedStatusFilter || e.status === selectedStatusFilter;
    const matchesAdmission = !selectedAdmissionFilter || e.admissionType === selectedAdmissionFilter;

    return matchesSearch && matchesYear && matchesClass && matchesStatus && matchesAdmission;
  });

  const handleOpenEnrollModal = () => {
    setIsEnrollModalOpen(true);
    setFormError(null);
    if (activeYear) setSelectedYearId(activeYear.id);
    if (stages.length > 0) setSelectedStageId(stages[0].id);
    if (parents.length > 0) setSelectedParentId(parents[0].id);
    if (students.length > 0) setSelectedStudentId(students[0].id);
  };

  const handleStageChange = (stgId: string) => {
    setSelectedStageId(stgId);
    const validGrades = grades.filter((g) => g.stageId === stgId);
    if (validGrades.length > 0) {
      setSelectedGradeId(validGrades[0].id);
      const validCls = classes.filter((c) => c.gradeId === validGrades[0].id);
      setSelectedClassId(validCls.length > 0 ? validCls[0].id : '');
    } else {
      setSelectedGradeId('');
      setSelectedClassId('');
    }
  };

  const handleGradeChange = (grdId: string) => {
    setSelectedGradeId(grdId);
    const validCls = classes.filter((c) => c.gradeId === grdId);
    setSelectedClassId(validCls.length > 0 ? validCls[0].id : '');
  };

  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (isClassAtCapacity && !isAdminOverride) {
        throw new Error(`Class '${targetClass?.name}' has reached capacity (${targetClass?.capacity}). Select Administrative Override to proceed (E-13 violation).`);
      }

      if (isNewStudentMode) {
        if (!newNatId || !newFirstName || !newLastName || !selectedParentId) {
          throw new Error('Please fill in all mandatory student master fields.');
        }
        await onCreateStudentAndEnroll(
          {
            nationalId: newNatId,
            firstName: newFirstName,
            lastName: newLastName,
            gender: newGender,
            dateOfBirth: newDob,
            parentId: selectedParentId,
          },
          {
            academicYearId: selectedYearId,
            stageId: selectedStageId,
            gradeId: selectedGradeId,
            classId: selectedClassId,
            admissionType,
            transferOrigin: admissionType === 'TRANSFER_IN' ? transferOrigin : undefined,
            isAdministrativeOverride: isAdminOverride,
            overrideReason,
          }
        );
      } else {
        if (!selectedStudentId) {
          throw new Error('Please select an existing student.');
        }
        await onCreateEnrollment({
          studentId: selectedStudentId,
          academicYearId: selectedYearId,
          stageId: selectedStageId,
          gradeId: selectedGradeId,
          classId: selectedClassId,
          admissionType,
          transferOrigin: admissionType === 'TRANSFER_IN' ? transferOrigin : undefined,
          isAdministrativeOverride: isAdminOverride,
          overrideReason,
        });
      }

      setIsEnrollModalOpen(false);
      // Reset
      setTransferOrigin('');
      setOverrideReason('');
      setIsAdminOverride(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateQuickParent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parent = await onCreateParent({
        nationalId: pNatId,
        fullName: pFullName,
        email: pEmail,
        phone: pPhone,
        relationship: pRel,
      });
      setSelectedParentId(parent.id);
      setIsParentModalOpen(false);
      setPNatId('');
      setPFullName('');
      setPEmail('');
      setPPhone('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalEnrollment) return;
    try {
      await onUpdateStatus(statusModalEnrollment.id, newStatus, statusReason);
      setStatusModalEnrollment(null);
      setStatusReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg);
    }
  };

  const getStatusBadge = (status: EnrollmentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Active</span>;
      case 'WITHDRAWN':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">Withdrawn</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">Completed</span>;
      case 'SUSPENDED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">Suspended</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getAdmissionBadge = (type: AdmissionType) => {
    switch (type) {
      case 'NEW':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">New Admission</span>;
      case 'CONTINUING':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">Continuing</span>;
      case 'TRANSFER_IN':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Transfer-In</span>;
      case 'RETURNING':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Returning</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300">{type}</span>;
    }
  };

  const getResultBadge = (res: AcademicResult) => {
    switch (res) {
      case 'PASS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">PASS</span>;
      case 'FAIL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300">FAIL</span>;
      case 'REPEATING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300">REPEATING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">PENDING</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Overview Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Enrollments</span>
            <div className="text-2xl font-bold text-white tracking-tight">{enrollments.length}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Registrations</span>
            <div className="text-2xl font-bold text-emerald-300 tracking-tight">
              {enrollments.filter((e) => e.status === 'ACTIVE').length}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Students Enrolled</span>
            <div className="text-2xl font-bold text-blue-300 tracking-tight">
              {new Set(enrollments.map((e) => e.studentId)).size}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Academic Year</span>
            <div className="text-sm font-semibold text-purple-300 truncate">
              {activeYear ? activeYear.code : 'No Active Year'}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action & Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student name, file #, national ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Filter */}
          <select
            value={selectedYearFilter}
            onChange={(e) => setSelectedYearFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Academic Years</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.code} {y.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>

          {/* Admission Type Filter */}
          <select
            value={selectedAdmissionFilter}
            onChange={(e) => setSelectedAdmissionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Admission Types</option>
            <option value="NEW">New Admission</option>
            <option value="CONTINUING">Continuing</option>
            <option value="TRANSFER_IN">Transfer-In</option>
            <option value="RETURNING">Returning</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="COMPLETED">Completed</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* New Enrollment Action Button */}
          <button
            onClick={handleOpenEnrollModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll Student</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Enrollments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Student Enrollment Records</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredEnrollments.length} of {enrollments.length} records
          </span>
        </div>

        {filteredEnrollments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <UserCheck className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-medium">No enrollment records match the current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Student & File #</th>
                  <th className="px-4 py-3">National ID</th>
                  <th className="px-4 py-3">Academic Year</th>
                  <th className="px-4 py-3">Stage & Grade</th>
                  <th className="px-4 py-3">Class Assigned</th>
                  <th className="px-4 py-3">Admission Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Academic Result</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredEnrollments.map((enr) => {
                  const studentObj = students.find((s) => s.id === enr.studentId);

                  return (
                    <tr key={enr.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{enr.studentName || 'Student'}</div>
                        <div className="text-[11px] font-mono text-slate-500">{enr.fileNumber || enr.studentId}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{enr.nationalId || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-300">{enr.academicYearCode || enr.academicYearId}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-200">{enr.gradeName}</div>
                        <div className="text-[10px] text-slate-500">{enr.stageName}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-400">{enr.className}</td>
                      <td className="px-4 py-3">
                        {getAdmissionBadge(enr.admissionType)}
                        {enr.transferOrigin && (
                          <div className="text-[10px] text-purple-400/80 truncate max-w-[120px]" title={enr.transferOrigin}>
                            From: {enr.transferOrigin}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(enr.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {getResultBadge(enr.academicResult)}
                          <select
                            value={enr.academicResult}
                            onChange={(e) => onUpdateResult(enr.id, e.target.value as AcademicResult)}
                            className="bg-slate-950 border border-slate-800 text-[10px] text-slate-400 rounded px-1 py-0.5 focus:outline-none"
                            title="Update academic result boundary contract"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PASS">PASS</option>
                            <option value="FAIL">FAIL</option>
                            <option value="REPEATING">REPEATING</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => studentObj && setHistoryStudent(studentObj)}
                          title="View complete historical enrollment records"
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium cursor-pointer inline-flex items-center gap-1"
                        >
                          <History className="w-3.5 h-3.5 text-indigo-400" />
                          <span>History</span>
                        </button>
                        <button
                          onClick={() => {
                            setStatusModalEnrollment(enr);
                            setNewStatus(enr.status);
                            setStatusReason('');
                          }}
                          title="Change enrollment status"
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium cursor-pointer inline-flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Status</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ENROLLMENT CREATION MODAL --- */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Student Academic Enrollment</h3>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEnrollment} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Toggle: Existing Student vs New Master Registration */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Student Identity Source</span>
                  <span className="text-[11px] text-slate-500">Choose existing student or register a new person</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewStudentMode(false)}
                    className={`px-3 py-1 text-xs rounded-md font-semibold cursor-pointer transition-colors ${
                      !isNewStudentMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Existing Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewStudentMode(true)}
                    className={`px-3 py-1 text-xs rounded-md font-semibold cursor-pointer transition-colors ${
                      isNewStudentMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    New Student
                  </button>
                </div>
              </div>

              {/* Student Selection / Registration Section */}
              {!isNewStudentMode ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Select Existing Student *</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} — File: {s.fileNumber} (Nat ID: {s.nationalId})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    <span>New Student Master Registration</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">National ID *</label>
                      <input
                        type="text"
                        value={newNatId}
                        onChange={(e) => setNewNatId(e.target.value)}
                        placeholder="e.g. 30201010198765"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Parent / Guardian *</label>
                      <div className="flex gap-1">
                        <select
                          value={selectedParentId}
                          onChange={(e) => setSelectedParentId(e.target.value)}
                          required
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          {parents.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName} ({p.relationship}) — {p.phone}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsParentModalOpen(true)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
                          title="Add Parent"
                        >
                          + Parent
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        placeholder="e.g. Yousef"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        placeholder="e.g. Al-Mansoor"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Gender *</label>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value as 'MALE' | 'FEMALE')}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="MALE">MALE</option>
                        <option value="FEMALE">FEMALE</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        value={newDob}
                        onChange={(e) => setNewDob(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Admission Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Admission Type *</label>
                  <select
                    value={admissionType}
                    onChange={(e) => setAdmissionType(e.target.value as AdmissionType)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="NEW">NEW (First time entry)</option>
                    <option value="CONTINUING">CONTINUING (Promoted / Next Year)</option>
                    <option value="TRANSFER_IN">TRANSFER-IN (From another school)</option>
                    <option value="RETURNING">RETURNING (Re-enrolling after break)</option>
                  </select>
                </div>

                {admissionType === 'TRANSFER_IN' && (
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Transfer Origin School *</label>
                    <input
                      type="text"
                      placeholder="e.g. Cairo International School"
                      value={transferOrigin}
                      onChange={(e) => setTransferOrigin(e.target.value)}
                      required={admissionType === 'TRANSFER_IN'}
                      className="w-full bg-slate-950 border border-purple-500/30 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Academic Year *</label>
                  <select
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.code} {y.isActive ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cascading Academic Assignment: Stage -> Grade -> Class */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Stage *</label>
                  <select
                    value={selectedStageId}
                    onChange={(e) => handleStageChange(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    {stages.map((stg) => (
                      <option key={stg.id} value={stg.id}>
                        {stg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Grade *</label>
                  <select
                    value={selectedGradeId}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    {filteredGrades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Classroom *</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    {filteredClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.currentEnrollmentCount}/{cls.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class Capacity Status Box */}
              {targetClass && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    isClassAtCapacity
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>
                      Class <strong>{targetClass.name}</strong> Capacity: <strong>{targetClass.currentEnrollmentCount}</strong> / <strong>{targetClass.capacity}</strong>
                    </span>
                  </div>
                  {isClassAtCapacity && (
                    <span className="font-bold text-amber-400 uppercase text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">
                      FULL CAPACITY
                    </span>
                  )}
                </div>
              )}

              {/* Administrative Override Section if full */}
              {isClassAtCapacity && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                    <input
                      type="checkbox"
                      checked={isAdminOverride}
                      onChange={(e) => setIsAdminOverride(e.target.checked)}
                      className="rounded bg-slate-900 border-amber-500/50 text-amber-500 focus:ring-0"
                    />
                    <span>Enable Administrative Capacity Override</span>
                  </label>

                  {isAdminOverride && (
                    <div>
                      <label className="block text-[11px] font-medium text-amber-300 mb-1">
                        Override Reason * (minimum 5 characters, written to audit trail)
                      </label>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="State administrative justification for exceeding class capacity limit..."
                        required={isAdminOverride}
                        rows={2}
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-lg p-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- QUICK ADD PARENT MODAL --- */}
      {isParentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Quick Register Parent / Guardian</span>
            </h3>

            <form onSubmit={handleCreateQuickParent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">National ID *</label>
                <input
                  type="text"
                  value={pNatId}
                  onChange={(e) => setPNatId(e.target.value)}
                  placeholder="e.g. 10020030040099"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={pFullName}
                  onChange={(e) => setPFullName(e.target.value)}
                  placeholder="e.g. Tariq Al-Mansoor"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={pPhone}
                    onChange={(e) => setPPhone(e.target.value)}
                    placeholder="+20100..."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Relationship *</label>
                  <select
                    value={pRel}
                    onChange={(e) => setPRel(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                  >
                    <option value="FATHER">FATHER</option>
                    <option value="MOTHER">MOTHER</option>
                    <option value="GUARDIAN">GUARDIAN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={pEmail}
                  onChange={(e) => setPEmail(e.target.value)}
                  placeholder="tariq@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsParentModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold">
                  Save Parent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ENROLLMENT HISTORY MODAL --- */}
      {historyStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <span>Student Enrollment History Trace</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Student: <strong>{historyStudent.firstName} {historyStudent.lastName}</strong> (File: {historyStudent.fileNumber} | ID: {historyStudent.id})
                </p>
              </div>
              <button
                onClick={() => setHistoryStudent(null)}
                className="text-slate-400 hover:text-slate-200 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {enrollments.filter((e) => e.studentId === historyStudent.id).length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No historical enrollment records found.</div>
              ) : (
                enrollments
                  .filter((e) => e.studentId === historyStudent.id)
                  .map((e) => (
                    <div key={e.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-300">{e.academicYearCode}</span>
                        <div className="flex items-center gap-2">
                          {getAdmissionBadge(e.admissionType)}
                          {getStatusBadge(e.status)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-400">
                        <div>Stage: <strong className="text-slate-200">{e.stageName}</strong></div>
                        <div>Grade: <strong className="text-slate-200">{e.gradeName}</strong></div>
                        <div>Class: <strong className="text-emerald-300">{e.className}</strong></div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] text-slate-500">
                        <span>Result Contract: <strong>{e.academicResult}</strong></span>
                        <span>Record ID: {e.id}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setHistoryStudent(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STATUS CHANGE MODAL --- */}
      {statusModalEnrollment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span>Update Enrollment Status</span>
            </h3>

            <p className="text-xs text-slate-400">
              Updating status for <strong>{statusModalEnrollment.studentName}</strong> ({statusModalEnrollment.academicYearCode}).
            </p>

            <form onSubmit={handleStatusSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as EnrollmentStatus)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE (Enrolled)</option>
                  <option value="WITHDRAWN">WITHDRAWN (Student left)</option>
                  <option value="COMPLETED">COMPLETED (Term finished)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporary hold)</option>
                  <option value="CANCELLED">CANCELLED (Registration voided)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Reason / Notes</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Reason for status lifecycle change..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusModalEnrollment(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold cursor-pointer">
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
