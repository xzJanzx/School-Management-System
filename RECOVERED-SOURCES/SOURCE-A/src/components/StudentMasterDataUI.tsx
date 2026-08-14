/**
 * SMS — Student Master Data (Module 01) UI Component
 */

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  FileText,
  ShieldAlert,
  History,
  Paperclip,
  CheckCircle,
  XCircle,
  Edit2,
  RefreshCw,
  X,
  AlertTriangle,
} from 'lucide-react';

export interface Student {
  id: string;
  studentId: string;
  fileNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullNameArabic?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
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
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  title: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  reason?: string;
  details?: string;
  timestamp: string;
}

export interface StudentStatusHistoryItem {
  id: string;
  studentId: string;
  oldStatus?: string;
  newStatus: string;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface GuardianItem {
  id: string;
  studentId: string;
  guardianId: string;
  isPrimary: boolean;
  relationship?: string;
  guardian: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId?: string;
    phone?: string;
    email?: string;
  };
}

export function StudentMasterDataUI() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Active State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'guardians' | 'statusHistory' | 'audit'>('details');

  // Document, Guardian & Audit Data for selected student
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [guardians, setGuardians] = useState<GuardianItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StudentStatusHistoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Guardian Form State
  const [guardianFormData, setGuardianFormData] = useState({
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    email: '',
    relationship: 'FATHER',
    isPrimary: true,
  });

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    matches: Array<{ id: string; studentId: string; firstName: string; lastName: string }>;
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Status Change Dialog
  const [statusModalStudent, setStatusModalStudent] = useState<Student | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED'>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    fullNameArabic: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: 'Egyptian',
    nationalId: '',
    passportNumber: '',
    religion: '',
    bloodGroup: '',
    medicalNotes: '',
    addressLine1: '',
    city: 'Cairo',
    state: '',
    postalCode: '',
    country: 'Egypt',
    phone: '',
    email: '',
  });

  // Doc Form State
  const [docFormData, setDocFormData] = useState({
    title: '',
    documentType: 'BIRTH_CERTIFICATE',
    fileName: '',
    filePath: '',
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [query, statusFilter]);

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      fullNameArabic: '',
      gender: 'MALE',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'Egyptian',
      nationalId: '',
      passportNumber: '',
      religion: '',
      bloodGroup: '',
      medicalNotes: '',
      addressLine1: '',
      city: 'Cairo',
      state: '',
      postalCode: '',
      country: 'Egypt',
      phone: '',
      email: '',
    });
    setDuplicateWarning(null);
    setOverrideReason('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      firstName: student.firstName || '',
      middleName: student.middleName || '',
      lastName: student.lastName || '',
      fullNameArabic: student.fullNameArabic || '',
      gender: student.gender || 'MALE',
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
      placeOfBirth: student.placeOfBirth || '',
      nationality: student.nationality || '',
      nationalId: student.nationalId || '',
      passportNumber: student.passportNumber || '',
      religion: student.religion || '',
      bloodGroup: student.bloodGroup || '',
      medicalNotes: student.medicalNotes || '',
      addressLine1: student.addressLine1 || '',
      city: student.city || '',
      state: student.state || '',
      postalCode: student.postalCode || '',
      country: student.country || '',
      phone: student.phone || '',
      email: student.email || '',
    });
    setDuplicateWarning(null);
    setOverrideReason('');
    setShowFormModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent, override = false) => {
    e.preventDefault();

    const payload = {
      ...formData,
      ...(override ? { overrideDuplicate: true, overrideReason } : {}),
    };

    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'REGISTRAR',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.details?.isDuplicate) {
        setDuplicateWarning({
          message: data.message,
          matches: data.details.matches || [],
        });
        return;
      }

      if (!res.ok) {
        alert(data.message || 'Error saving student record');
        return;
      }

      setShowFormModal(false);
      setDuplicateWarning(null);
      setOverrideReason('');
      fetchStudents();
    } catch (err) {
      console.error('Error saving student:', err);
      alert('Failed to connect to server');
    }
  };

  const handleViewDetail = async (student: Student) => {
    setSelectedStudent(student);
    setActiveTab('details');

    // Fetch documents, guardians, status history & audit logs
    try {
      const [docRes, gRes, shRes, auditRes] = await Promise.all([
        fetch(`/api/students/${student.id}/documents`),
        fetch(`/api/students/${student.id}/guardians`),
        fetch(`/api/students/${student.id}/status-history`),
        fetch(`/api/students/${student.id}/audit-logs`),
      ]);

      if (docRes.ok) setDocuments(await docRes.json());
      if (gRes.ok) setGuardians(await gRes.json());
      if (shRes.ok) setStatusHistory(await shRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (err) {
      console.error('Failed to load student details:', err);
    }
  };

  const handleAddGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const res = await fetch(`/api/students/${selectedStudent.id}/guardians`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'REGISTRAR',
        },
        body: JSON.stringify(guardianFormData),
      });

      if (res.ok) {
        const gRes = await fetch(`/api/students/${selectedStudent.id}/guardians`);
        if (gRes.ok) setGuardians(await gRes.json());
        setGuardianFormData({
          firstName: '',
          lastName: '',
          nationalId: '',
          phone: '',
          email: '',
          relationship: 'FATHER',
          isPrimary: false,
        });
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to add guardian link');
      }
    } catch (err) {
      console.error('Failed to link guardian:', err);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const res = await fetch(`/api/students/${selectedStudent.id}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'REGISTRAR',
        },
        body: JSON.stringify({
          ...docFormData,
          fileSize: 1024 * 50,
          mimeType: 'application/pdf',
        }),
      });

      if (res.ok) {
        const docRes = await fetch(`/api/students/${selectedStudent.id}/documents`);
        if (docRes.ok) setDocuments(await docRes.json());
        setDocFormData({ title: '', documentType: 'BIRTH_CERTIFICATE', fileName: '', filePath: '' });
      }
    } catch (err) {
      console.error('Failed to attach document:', err);
    }
  };

  const handleChangeStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalStudent || !statusReason) return;

    try {
      const res = await fetch(`/api/students/${statusModalStudent.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'REGISTRAR',
        },
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason,
        }),
      });

      if (res.ok) {
        setStatusModalStudent(null);
        setStatusReason('');
        fetchStudents();
        if (selectedStudent?.id === statusModalStudent.id) {
          const updated = await res.json();
          setSelectedStudent(updated);
        }
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6 text-slate-800">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Module 01 — Student Master Data
          </h2>
          <p className="text-sm text-slate-500">
            Permanent Student Identities, File Numbers, Master Metadata, and Document Attachments
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition"
        >
          <UserPlus className="w-4 h-4" />
          New Student Master Record
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Student ID, File #, Name, Civil ID, Phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Master Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <button
          onClick={fetchStudents}
          className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 transition"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Student List Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
            <tr>
              <th className="p-3">Student ID</th>
              <th className="p-3">File Number</th>
              <th className="p-3">Full Name</th>
              <th className="p-3">Gender / DOB</th>
              <th className="p-3">National ID</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400">
                  Loading student master records...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No student records found. Click &quot;New Student Master Record&quot; to register a student.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-semibold text-indigo-700">{student.studentId}</td>
                  <td className="p-3 font-mono text-slate-600">{student.fileNumber}</td>
                  <td className="p-3 font-medium text-slate-900">
                    {student.firstName} {student.middleName} {student.lastName}
                    {student.fullNameArabic && (
                      <span className="block text-xs text-slate-400 font-sans">{student.fullNameArabic}</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    <span className="capitalize">{student.gender.toLowerCase()}</span>
                    <span className="block text-xs text-slate-400">
                      {new Date(student.dateOfBirth).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-600">{student.nationalId || '—'}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        student.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : student.status === 'SUSPENDED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {student.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleViewDetail(student)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleOpenEdit(student)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setStatusModalStudent(student);
                        setNewStatus(student.status);
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs font-medium"
                    >
                      Status
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Registration & Edit Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStudent ? `Edit Master Record (${editingStudent.studentId})` : 'Register New Student Master Record'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {duplicateWarning ? (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-3">
                <div className="flex items-start gap-2 text-amber-800 font-semibold">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>{duplicateWarning.message}</p>
                    <p className="text-xs font-normal text-amber-700 mt-1">
                      Matched records in database: {duplicateWarning.matches.map((m) => `${m.firstName} ${m.lastName} (${m.studentId})`).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <label className="block text-xs font-semibold text-amber-900">
                    Authorized Override Reason (Required to bypass duplicate block):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter official reason for override..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full border border-amber-300 rounded px-3 py-1.5 text-sm bg-white"
                  />
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={(e) => handleSaveStudent(e, true)}
                      disabled={!overrideReason.trim()}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium disabled:opacity-50"
                    >
                      Bypass Duplicate & Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateWarning(null)}
                      className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Cancel Override
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleSaveStudent(e, false)} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name (Arabic)</label>
                    <input
                      type="text"
                      value={formData.fullNameArabic}
                      onChange={(e) => setFormData({ ...formData, fullNameArabic: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                      placeholder="الاسم الكامل بالعربية"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'MALE' | 'FEMALE' })}
                      className="w-full border rounded px-3 py-1.5 bg-white"
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">National / Civil ID</label>
                    <input
                      type="text"
                      value={formData.nationalId}
                      onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full border rounded px-3 py-1.5"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium">
                    {editingStudent ? 'Save Changes' : 'Register Student'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Detail View Drawer/Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedStudent.firstName} {selectedStudent.middleName} {selectedStudent.lastName}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                  <span>Student ID: <strong className="text-indigo-700">{selectedStudent.studentId}</strong></span>
                  <span>File #: <strong className="text-slate-700">{selectedStudent.fileNumber}</strong></span>
                  <span>Status: <strong className="text-slate-700">{selectedStudent.status}</strong></span>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b text-sm font-medium overflow-x-auto">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                Master Identity Details
              </button>
              <button
                onClick={() => setActiveTab('guardians')}
                className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === 'guardians' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                Guardians ({guardians.length})
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === 'documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                Attached Documents ({documents.length})
              </button>
              <button
                onClick={() => setActiveTab('statusHistory')}
                className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === 'statusHistory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                Status History ({statusHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                Audit Trail ({auditLogs.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-sm">
              {activeTab === 'details' && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border text-xs">
                  <div><strong className="text-slate-500">Full Name Arabic:</strong> <span className="block text-sm">{selectedStudent.fullNameArabic || '—'}</span></div>
                  <div><strong className="text-slate-500">Gender:</strong> <span className="block text-sm">{selectedStudent.gender}</span></div>
                  <div><strong className="text-slate-500">Date of Birth:</strong> <span className="block text-sm">{new Date(selectedStudent.dateOfBirth).toLocaleDateString()}</span></div>
                  <div><strong className="text-slate-500">National / Civil ID:</strong> <span className="block text-sm">{selectedStudent.nationalId || '—'}</span></div>
                  <div><strong className="text-slate-500">Nationality:</strong> <span className="block text-sm">{selectedStudent.nationality || '—'}</span></div>
                  <div><strong className="text-slate-500">Phone:</strong> <span className="block text-sm">{selectedStudent.phone || '—'}</span></div>
                  <div><strong className="text-slate-500">Address:</strong> <span className="block text-sm">{selectedStudent.addressLine1}, {selectedStudent.city}</span></div>
                  <div><strong className="text-slate-500">Registered At:</strong> <span className="block text-sm">{new Date(selectedStudent.createdAt).toLocaleString()}</span></div>
                </div>
              )}

              {activeTab === 'guardians' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddGuardian} className="bg-slate-50 p-3 rounded border space-y-2 text-xs">
                    <p className="font-semibold text-slate-800">Link Guardian (Module 01 - 02 Integration Boundary)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Guardian First Name *"
                        required
                        value={guardianFormData.firstName}
                        onChange={(e) => setGuardianFormData({ ...guardianFormData, firstName: e.target.value })}
                        className="border rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Guardian Last Name *"
                        required
                        value={guardianFormData.lastName}
                        onChange={(e) => setGuardianFormData({ ...guardianFormData, lastName: e.target.value })}
                        className="border rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="National ID"
                        value={guardianFormData.nationalId}
                        onChange={(e) => setGuardianFormData({ ...guardianFormData, nationalId: e.target.value })}
                        className="border rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={guardianFormData.phone}
                        onChange={(e) => setGuardianFormData({ ...guardianFormData, phone: e.target.value })}
                        className="border rounded px-2 py-1 text-xs"
                      />
                      <select
                        value={guardianFormData.relationship}
                        onChange={(e) => setGuardianFormData({ ...guardianFormData, relationship: e.target.value })}
                        className="border rounded px-2 py-1 text-xs bg-white"
                      >
                        <option value="FATHER">Father</option>
                        <option value="MOTHER">Mother</option>
                        <option value="GRANDFATHER">Grandfather</option>
                        <option value="GRANDMOTHER">Grandmother</option>
                        <option value="BROTHER">Brother</option>
                        <option value="SISTER">Sister</option>
                        <option value="UNCLE">Uncle (Paternal)</option>
                        <option value="AUNT">Aunt (Paternal)</option>
                        <option value="MATERNAL_UNCLE">Maternal Uncle</option>
                        <option value="MATERNAL_AUNT">Maternal Aunt</option>
                        <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={guardianFormData.isPrimary}
                          onChange={(e) => setGuardianFormData({ ...guardianFormData, isPrimary: e.target.checked })}
                          className="rounded border-slate-300"
                        />
                        Primary Guardian
                      </label>
                    </div>
                    <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium">
                      Link Guardian
                    </button>
                  </form>

                  <div className="divide-y border rounded">
                    {guardians.length === 0 ? (
                      <p className="p-3 text-xs text-slate-400">No linked guardians found.</p>
                    ) : (
                      guardians.map((g) => (
                        <div key={g.id} className="p-3 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-semibold text-slate-800 flex items-center gap-2">
                              {g.guardian.firstName} {g.guardian.lastName}
                              {g.isPrimary && (
                                <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  PRIMARY
                                </span>
                              )}
                            </p>
                            <p className="text-slate-500">{g.relationship} • Phone: {g.guardian.phone || '—'} • Civil ID: {g.guardian.nationalId || '—'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'statusHistory' && (
                <div className="space-y-2">
                  {statusHistory.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 border rounded">No historical status transitions recorded.</p>
                  ) : (
                    statusHistory.map((item) => (
                      <div key={item.id} className="p-3 border rounded bg-slate-50 text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>
                            {item.oldStatus ? `${item.oldStatus} ➔ ` : ''}
                            <span className="text-indigo-700 font-mono">{item.newStatus}</span>
                          </span>
                          <span className="text-slate-400">{new Date(item.changedAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600">Reason: &quot;{item.reason}&quot;</p>
                        <p className="text-slate-400 text-[10px]">Changed by: {item.changedBy}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddDocument} className="bg-slate-50 p-3 rounded border flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Doc Title (e.g. Birth Cert)"
                      required
                      value={docFormData.title}
                      onChange={(e) => setDocFormData({ ...docFormData, title: e.target.value })}
                      className="border rounded px-2 py-1 text-xs flex-1"
                    />
                    <select
                      value={docFormData.documentType}
                      onChange={(e) => setDocFormData({ ...docFormData, documentType: e.target.value })}
                      className="border rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
                      <option value="NATIONAL_ID">National ID Copy</option>
                      <option value="PASSPORT">Passport Copy</option>
                      <option value="MEDICAL_RECORD">Medical Record</option>
                    </select>
                    <input
                      type="text"
                      placeholder="File path / URI"
                      required
                      value={docFormData.filePath}
                      onChange={(e) => setDocFormData({ ...docFormData, filePath: e.target.value, fileName: e.target.value.split('/').pop() || 'doc.pdf' })}
                      className="border rounded px-2 py-1 text-xs flex-1"
                    />
                    <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium">
                      Attach
                    </button>
                  </form>

                  <div className="divide-y border rounded">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-800">{doc.title}</p>
                          <p className="text-slate-500 font-mono">{doc.documentType} • {doc.filePath}</p>
                        </div>
                        <span className="text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 border rounded bg-slate-50 text-xs space-y-1">
                      <div className="flex justify-between font-medium text-slate-800">
                        <span className="text-indigo-700">{log.action}</span>
                        <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600">By: {log.actor} {log.reason ? `• Reason: "${log.reason}"` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModalStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Change Master Status ({statusModalStudent.studentId})</h3>
            <form onSubmit={handleChangeStatusSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full border rounded px-3 py-1.5 bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for status change *</label>
                <textarea
                  required
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Official reason for master status change..."
                  className="w-full border rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalStudent(null)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded font-medium">
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
