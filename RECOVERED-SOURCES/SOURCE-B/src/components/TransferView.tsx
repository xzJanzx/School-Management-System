import React, { useState, useEffect, useMemo } from 'react';
import {
  StudentTransfer,
  CreateTransferRequest,
  TransferType,
  TransferStatus,
  UserContext,
  AcademicYear,
  AcademicStage,
  Grade,
  ClassRoom,
  Student,
  SMS_PERMISSIONS,
} from '../types/sms';
import {
  ArrowRightLeft,
  School,
  Building,
  UserCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface TransferViewProps {
  user: UserContext;
  authToken: string;
  years: AcademicYear[];
  stages: AcademicStage[];
  grades: Grade[];
  classes: ClassRoom[];
  students: Student[];
  onRefreshData: () => void;
}

export const TransferView: React.FC<TransferViewProps> = ({
  user,
  authToken,
  years,
  stages,
  grades,
  classes,
  students,
  onRefreshData,
}) => {
  const [transfers, setTransfers] = useState<StudentTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Request Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [transferType, setTransferType] = useState<TransferType>('INTERNAL');
  const [targetStageId, setTargetStageId] = useState<string>('');
  const [targetGradeId, setTargetGradeId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [destinationSchool, setDestinationSchool] = useState<string>('');
  const [destinationDetails, setDestinationDetails] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Action Modals
  const [selectedTransfer, setSelectedTransfer] = useState<StudentTransfer | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);

  // Execution Modal (for capacity override if full)
  const [isExecModalOpen, setIsExecModalOpen] = useState<boolean>(false);
  const [isCapacityOverride, setIsCapacityOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const activeYear = useMemo(() => years.find((y) => y.isActive), [years]);

  // Fetch Transfers
  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/sms/transfers?';
      if (filterType !== 'ALL') url += `transferType=${filterType}&`;
      if (filterStatus !== 'ALL') url += `status=${filterStatus}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setTransfers(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [filterType, filterStatus, searchTerm, authToken]);

  // Selected Student Details for creation modal
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const selectedStudentClass = useMemo(() => {
    if (!selectedStudent?.currentClassId) return null;
    return classes.find((c) => c.id === selectedStudent.currentClassId);
  }, [classes, selectedStudent]);

  // Filtered target grades based on stage
  const availableTargetGrades = useMemo(() => {
    if (!targetStageId) return [];
    return grades.filter((g) => g.stageId === targetStageId);
  }, [grades, targetStageId]);

  // Filtered target classes based on grade
  const availableTargetClasses = useMemo(() => {
    if (!targetGradeId) return [];
    return classes.filter((c) => c.gradeId === targetGradeId);
  }, [classes, targetGradeId]);

  const targetClassDetails = useMemo(() => {
    if (!targetClassId) return null;
    return classes.find((c) => c.id === targetClassId);
  }, [classes, targetClassId]);

  // Target class capacity alert check
  const isTargetClassFull = useMemo(() => {
    if (!targetClassDetails) return false;
    return targetClassDetails.currentEnrollmentCount >= targetClassDetails.capacity;
  }, [targetClassDetails]);

  // Permissions checks
  const canRequest =
    user.role === 'SUPER_ADMIN' ||
    user.permissions.includes(SMS_PERMISSIONS.REQUEST_TRANSFER) ||
    user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS) ||
    user.permissions.includes(SMS_PERMISSIONS.CREATE_ENROLLMENT);

  const canReview =
    user.role === 'SUPER_ADMIN' ||
    user.role === 'ACADEMIC_ADMIN' ||
    user.role === 'SCHOOL_HEAD' ||
    user.permissions.includes(SMS_PERMISSIONS.REVIEW_TRANSFER) ||
    user.permissions.includes(SMS_PERMISSIONS.APPROVE_TRANSFER);

  const canExecute =
    user.role === 'SUPER_ADMIN' ||
    user.role === 'ACADEMIC_ADMIN' ||
    user.permissions.includes(SMS_PERMISSIONS.EXECUTE_TRANSFER) ||
    user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS);

  // Reset form
  const resetForm = () => {
    setSelectedStudentId('');
    setTransferType('INTERNAL');
    setTargetStageId('');
    setTargetGradeId('');
    setTargetClassId('');
    setDestinationSchool('');
    setDestinationDetails('');
    setReason('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setError(null);
  };

  // Submit Create Transfer Request
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const payload: CreateTransferRequest = {
      studentId: selectedStudentId,
      transferType,
      targetStageId: transferType === 'INTERNAL' ? targetStageId : undefined,
      targetGradeId: transferType === 'INTERNAL' ? targetGradeId : undefined,
      targetClassId: transferType === 'INTERNAL' ? targetClassId : undefined,
      destinationSchoolName: transferType === 'EXTERNAL' ? destinationSchool : undefined,
      destinationDetails: transferType === 'EXTERNAL' ? destinationDetails : undefined,
      reason,
      effectiveDate,
    };

    try {
      const res = await fetch('/api/sms/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Transfer request ${json.data.transferNumber} submitted successfully!`);
        setIsCreateOpen(false);
        resetForm();
        fetchTransfers();
        onRefreshData();
      } else {
        setError(json.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Update Status Action
  const handleUpdateStatus = async (transferId: string, status: TransferStatus, statusReason?: string) => {
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/sms/transfers/${transferId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status, reason: statusReason }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Transfer request updated to ${status}`);
        setIsRejectModalOpen(false);
        setRejectionReason('');
        fetchTransfers();
        onRefreshData();
      } else {
        setError(json.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Execute Transfer Action
  const handleExecuteTransfer = async (t: StudentTransfer) => {
    // Check if target class is full for internal transfer
    if (t.transferType === 'INTERNAL' && t.targetClassId) {
      const targetCls = classes.find((c) => c.id === t.targetClassId);
      if (targetCls && targetCls.currentEnrollmentCount >= targetCls.capacity) {
        setSelectedTransfer(t);
        setIsCapacityOverride(true);
        setIsExecModalOpen(true);
        return;
      }
    }

    // Direct execution
    await runExecutionCall(t.id, false, undefined);
  };

  const runExecutionCall = async (transferId: string, isOverride: boolean, overrideRes?: string) => {
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/sms/transfers/${transferId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ isCapacityOverride: isOverride, overrideReason: overrideRes }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Transfer executed successfully! Student placement updated.`);
        setIsExecModalOpen(false);
        setOverrideReason('');
        fetchTransfers();
        onRefreshData();
      } else {
        setError(json.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"><Clock className="w-3.5 h-3.5" /> Pending Review</span>;
      case 'UNDER_REVIEW':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"><FileText className="w-3.5 h-3.5" /> Under Review</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'EXECUTED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200"><UserCheck className="w-3.5 h-3.5" /> Executed</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Cancelled</span>;
    }
  };

  // Statistics
  const stats = useMemo(() => {
    return {
      total: transfers.length,
      pending: transfers.filter((t) => ['PENDING', 'UNDER_REVIEW'].includes(t.status)).length,
      approved: transfers.filter((t) => t.status === 'APPROVED').length,
      executed: transfers.filter((t) => t.status === 'EXECUTED').length,
      rejected: transfers.filter((t) => t.status === 'REJECTED').length,
    };
  }, [transfers]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Student Transfer Management</h2>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              Module 05
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage internal section/grade transfers and external school exits with atomic capacity updates and full audit tracking.
          </p>
        </div>

        {canRequest && (
          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Transfer Request
          </button>
        )}
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Error Occurred</span>
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-xs underline">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Success</span>
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requests</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending / Review</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Approved</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Executed</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.executed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student name, file #, national ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Types</option>
              <option value="INTERNAL">Internal Transfers</option>
              <option value="EXTERNAL">External Transfers</option>
            </select>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="EXECUTED">Executed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transfers Data List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading transfers directory...</div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowRightLeft className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No transfer requests found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              There are no transfer records matching your current filters. Create a new transfer request to begin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Transfer #</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Source Placement</th>
                  <th className="px-4 py-3">Target / Destination</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-900">
                      {t.transferNumber}
                      {t.isCapacityOverride && (
                        <span className="block text-[10px] text-amber-700 font-sans font-semibold mt-0.5">
                          Capacity Override
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{t.studentName || 'Student'}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {t.fileNumber} &bull; ID: {t.nationalId}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
                        t.transferType === 'INTERNAL'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-purple-50 text-purple-700 border border-purple-100'
                      }`}>
                        {t.transferType === 'INTERNAL' ? <School className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                        {t.transferType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs font-medium text-slate-800">
                        {t.sourceStageName} &bull; {t.sourceGradeName}
                      </div>
                      <div className="text-xs font-semibold text-indigo-700 mt-0.5">
                        Class {t.sourceClassName}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {t.transferType === 'INTERNAL' ? (
                        <div>
                          <div className="text-xs font-medium text-slate-800">
                            {t.targetStageName} &bull; {t.targetGradeName}
                          </div>
                          <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                            Class {t.targetClassName}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{t.destinationSchoolName}</div>
                          {t.destinationDetails && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.destinationDetails}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{renderStatusBadge(t.status)}</td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      {/* Review / Approval Buttons */}
                      {canReview && t.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'UNDER_REVIEW')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded transition-colors"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransfer(t);
                              setIsRejectModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {canReview && t.status === 'UNDER_REVIEW' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransfer(t);
                              setIsRejectModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* Execute Button */}
                      {canExecute && t.status === 'APPROVED' && (
                        <button
                          onClick={() => handleExecuteTransfer(t)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm transition-colors"
                        >
                          Execute Transfer
                        </button>
                      )}

                      {/* Cancel Button */}
                      {['PENDING', 'UNDER_REVIEW', 'APPROVED'].includes(t.status) && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'CANCELLED')}
                          className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs rounded transition-colors"
                          title="Cancel Transfer Request"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE TRANSFER REQUEST MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                Submit Student Transfer Request
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Step 1: Select Student */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Active Student *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setTargetStageId('');
                    setTargetGradeId('');
                    setTargetClassId('');
                  }}
                  required
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose active student --</option>
                  {students
                    .filter((s) => s.isActive && s.currentClassId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.fileNumber} &bull; National ID: {s.nationalId})
                      </option>
                    ))}
                </select>
              </div>

              {/* Display Current Placement */}
              {selectedStudent && (
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-indigo-900 block">Current Active Placement</span>
                    <span className="text-indigo-700 mt-0.5 block">
                      {selectedStudentClass ? `Class ${selectedStudentClass.name}` : 'Enrolled'}
                    </span>
                  </div>
                  <div className="text-right text-indigo-800 font-mono">
                    File #: {selectedStudent.fileNumber}
                  </div>
                </div>
              )}

              {/* Step 2: Transfer Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Transfer Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransferType('INTERNAL')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      transferType === 'INTERNAL'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <School className="w-5 h-5 text-indigo-600 mb-1" />
                    <div className="font-bold text-slate-900 text-sm">Internal Transfer</div>
                    <div className="text-xs text-slate-500 mt-0.5">Move to another section, grade, or stage within school</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransferType('EXTERNAL')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      transferType === 'EXTERNAL'
                        ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Building className="w-5 h-5 text-purple-600 mb-1" />
                    <div className="font-bold text-slate-900 text-sm">External Transfer Out</div>
                    <div className="text-xs text-slate-500 mt-0.5">Transfer student out to an external school/academy</div>
                  </button>
                </div>
              </div>

              {/* Step 3A: Internal Target Structure */}
              {transferType === 'INTERNAL' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Target Academic Structure Placement
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Target Stage *</label>
                      <select
                        value={targetStageId}
                        onChange={(e) => {
                          setTargetStageId(e.target.value);
                          setTargetGradeId('');
                          setTargetClassId('');
                        }}
                        required={transferType === 'INTERNAL'}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Stage --</option>
                        {stages.map((stg) => (
                          <option key={stg.id} value={stg.id}>{stg.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Target Grade *</label>
                      <select
                        value={targetGradeId}
                        onChange={(e) => {
                          setTargetGradeId(e.target.value);
                          setTargetClassId('');
                        }}
                        required={transferType === 'INTERNAL'}
                        disabled={!targetStageId}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="">-- Choose Grade --</option>
                        {availableTargetGrades.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Target Class *</label>
                      <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        required={transferType === 'INTERNAL'}
                        disabled={!targetGradeId}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="">-- Choose Class --</option>
                        {availableTargetClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            Class {cls.name} ({cls.currentEnrollmentCount}/{cls.capacity})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Target Class Live Capacity Indicator */}
                  {targetClassDetails && (
                    <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      isTargetClassFull
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        {isTargetClassFull ? (
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Users className="w-4 h-4 text-emerald-600" />
                        )}
                        <span>
                          Target Capacity: <strong>{targetClassDetails.currentEnrollmentCount} / {targetClassDetails.capacity}</strong> students enrolled
                        </span>
                      </div>
                      {isTargetClassFull && (
                        <span className="font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                          At Full Capacity
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3B: External Destination Details */}
              {transferType === 'EXTERNAL' && (
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Destination School Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. St. George International Academy"
                      value={destinationSchool}
                      onChange={(e) => setDestinationSchool(e.target.value)}
                      required={transferType === 'EXTERNAL'}
                      minLength={3}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Destination Details / Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cairo Branch, Ministry License #4092"
                      value={destinationDetails}
                      onChange={(e) => setDestinationDetails(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Reason & Effective Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Transfer Reason * (Min 5 chars)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Parent requested section change for transport timing"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    minLength={5}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentId || (transferType === 'INTERNAL' && !targetClassId)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Submit Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {isRejectModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Reject Transfer Request
            </h3>
            <p className="text-sm text-slate-600">
              Please specify a detailed rejection reason for transfer <strong>{selectedTransfer.transferNumber}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Rejection Reason * (Min 5 chars)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Insufficient academic documentation provided"
                rows={3}
                required
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReason('');
                }}
                className="px-3 py-1.5 text-xs text-slate-600 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectionReason.trim().length < 5}
                onClick={() => handleUpdateStatus(selectedTransfer.id, 'REJECTED', rejectionReason)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXECUTE / CAPACITY OVERRIDE MODAL */}
      {isExecModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold">Target Class Capacity Warning</h4>
                <p className="text-xs text-amber-700">
                  Target class is currently at maximum capacity. An administrative override is required.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Administrative Override Reason * (Min 5 chars)
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Authorized by Academic Director due to sibling priority"
                rows={3}
                required
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsExecModalOpen(false);
                  setOverrideReason('');
                }}
                className="px-3 py-1.5 text-xs text-slate-600 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={overrideReason.trim().length < 5}
                onClick={() => runExecutionCall(selectedTransfer.id, true, overrideReason)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Confirm Capacity Override & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
