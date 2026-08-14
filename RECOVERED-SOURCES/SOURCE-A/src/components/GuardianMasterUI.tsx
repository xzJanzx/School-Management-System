/**
 * SMS — Module 02 Guardian Master Data UI Component
 */

import React, { useState, useEffect } from 'react';

interface StudentLink {
  id: string;
  isPrimary: boolean;
  relationship: string;
  relationshipDescription?: string;
  student: {
    id: string;
    studentId: string;
    fileNumber: string;
    firstName: string;
    lastName: string;
    status: string;
  };
}

interface Guardian {
  id: string;
  guardianId: string;
  firstName: string;
  lastName: string;
  nationalId?: string;
  phone: string;
  additionalPhone?: string;
  email?: string;
  address?: string;
  canContact: boolean;
  preferredContactMethod: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  students?: StudentLink[];
}

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  details: unknown;
  timestamp: string;
}

export function GuardianMasterUI() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Guardian drawer
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'students' | 'audit'>('details');

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nationalId: '',
    additionalPhone: '',
    email: '',
    address: '',
    canContact: true,
    preferredContactMethod: 'PHONE',
  });

  // Edit Form state
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nationalId: '',
    additionalPhone: '',
    email: '',
    address: '',
    canContact: true,
    preferredContactMethod: 'PHONE',
  });

  const fetchGuardians = async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guardians?q=${encodeURIComponent(q)}`, {
        headers: { 'X-User-Role': 'REGISTRAR' },
      });
      if (!res.ok) throw new Error('Failed to load guardians');
      const data = await res.json();
      setGuardians(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching guardians');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardians();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGuardians(searchQuery);
  };

  const handleCreateGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/guardians', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'REGISTRAR',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create guardian');

      setIsCreateOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        nationalId: '',
        additionalPhone: '',
        email: '',
        address: '',
        canContact: true,
        preferredContactMethod: 'PHONE',
      });
      fetchGuardians(searchQuery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating guardian');
    }
  };

  const handleSelectGuardian = async (guardianId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/guardians/${guardianId}`, {
        headers: { 'X-User-Role': 'REGISTRAR' },
      });
      if (!res.ok) throw new Error('Failed to fetch guardian details');
      const data = await res.json();
      setSelectedGuardian(data);
      setEditFormData({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        nationalId: data.nationalId || '',
        additionalPhone: data.additionalPhone || '',
        email: data.email || '',
        address: data.address || '',
        canContact: data.canContact,
        preferredContactMethod: data.preferredContactMethod || 'PHONE',
      });

      // Fetch audit logs
      const auditRes = await fetch(`/api/guardians/${data.id}/audit-logs`, {
        headers: { 'X-User-Role': 'ADMIN' },
      });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading guardian');
    }
  };

  const handleUpdateGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuardian) return;
    setError(null);

    try {
      const res = await fetch(`/api/guardians/${selectedGuardian.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'REGISTRAR',
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update guardian');

      setSelectedGuardian({ ...selectedGuardian, ...data });
      fetchGuardians(searchQuery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating guardian');
    }
  };

  const handleToggleStatus = async (guardian: Guardian) => {
    const nextStatus = guardian.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/guardians/${guardian.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'REGISTRAR',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to toggle status');
      }

      fetchGuardians(searchQuery);
      if (selectedGuardian?.id === guardian.id) {
        handleSelectGuardian(guardian.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change guardian status');
    }
  };

  const handleDeleteGuardian = async (guardian: Guardian) => {
    if (!confirm(`Are you sure you want to delete guardian ${guardian.guardianId}?`)) return;
    setError(null);

    try {
      const res = await fetch(`/api/guardians/${guardian.id}`, {
        method: 'DELETE',
        headers: { 'X-User-Role': 'REGISTRAR' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete guardian');

      setSelectedGuardian(null);
      fetchGuardians(searchQuery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error deleting guardian');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Module 02 — Parent / Guardian Master</h2>
          <p className="text-xs text-slate-500">Manage independent guardian records, contact preferences & student links</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
        >
          + Add New Guardian
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Search by Guardian ID, Name, Civil ID, or Phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 border rounded px-3 py-1.5 text-xs text-slate-800"
        />
        <button type="submit" className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-medium">
          Search
        </button>
      </form>

      {/* Guardians List Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 border-b uppercase font-semibold text-[10px]">
            <tr>
              <th className="p-2.5">Guardian ID</th>
              <th className="p-2.5">Full Name</th>
              <th className="p-2.5">Phone</th>
              <th className="p-2.5">Civil / National ID</th>
              <th className="p-2.5">Preference</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-400">Loading guardians...</td>
              </tr>
            ) : guardians.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-400">No guardian records found.</td>
              </tr>
            ) : (
              guardians.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono font-bold text-indigo-600">{g.guardianId}</td>
                  <td className="p-2.5 font-semibold text-slate-900">{g.firstName} {g.lastName}</td>
                  <td className="p-2.5">{g.phone}</td>
                  <td className="p-2.5 text-slate-500">{g.nationalId || '—'}</td>
                  <td className="p-2.5">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                      {g.preferredContactMethod}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        g.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {g.status}
                    </span>
                  </td>
                  <td className="p-2.5 flex items-center gap-2">
                    <button
                      onClick={() => handleSelectGuardian(g.id)}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      View Profile
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => handleToggleStatus(g)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      {g.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Guardian Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Create Guardian Master Record</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateGuardian} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Primary Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Civil / National ID</label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Additional Phone</label>
                  <input
                    type="text"
                    value={formData.additionalPhone}
                    onChange={(e) => setFormData({ ...formData, additionalPhone: e.target.value })}
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Physical Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.canContact}
                    onChange={(e) => setFormData({ ...formData, canContact: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span>Can Contact</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Preferred Method:</span>
                  <select
                    value={formData.preferredContactMethod}
                    onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
                    className="border rounded px-2 py-1 bg-white"
                  >
                    <option value="PHONE">Phone</option>
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 border rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                >
                  Create Guardian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guardian Profile Drawer */}
      {selectedGuardian && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col p-5 overflow-y-auto space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                  {selectedGuardian.guardianId}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedGuardian.firstName} {selectedGuardian.lastName}
                </h3>
              </div>
              <button onClick={() => setSelectedGuardian(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            {/* Profile Tabs */}
            <div className="flex border-b text-xs font-semibold">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 border-b-2 ${
                  activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                }`}
              >
                Guardian Details
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2 border-b-2 ${
                  activeTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                }`}
              >
                Linked Students ({selectedGuardian.students?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 border-b-2 ${
                  activeTab === 'audit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                }`}
              >
                Audit Log ({auditLogs.length})
              </button>
            </div>

            {/* Tab 1: Details / Edit */}
            {activeTab === 'details' && (
              <form onSubmit={handleUpdateGuardian} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">First Name</label>
                    <input
                      type="text"
                      value={editFormData.firstName}
                      onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editFormData.lastName}
                      onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Primary Phone</label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Civil / National ID</label>
                    <input
                      type="text"
                      value={editFormData.nationalId}
                      onChange={(e) => setEditFormData({ ...editFormData, nationalId: e.target.value })}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Additional Phone</label>
                    <input
                      type="text"
                      value={editFormData.additionalPhone}
                      onChange={(e) => setEditFormData({ ...editFormData, additionalPhone: e.target.value })}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.canContact}
                      onChange={(e) => setEditFormData({ ...editFormData, canContact: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span>Can Contact</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Preferred Method:</span>
                    <select
                      value={editFormData.preferredContactMethod}
                      onChange={(e) => setEditFormData({ ...editFormData, preferredContactMethod: e.target.value })}
                      className="border rounded px-2 py-1 bg-white"
                    >
                      <option value="PHONE">Phone</option>
                      <option value="SMS">SMS</option>
                      <option value="EMAIL">Email</option>
                      <option value="WHATSAPP">WhatsApp</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteGuardian(selectedGuardian)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-medium hover:bg-rose-100"
                  >
                    Delete Guardian
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Linked Students */}
            {activeTab === 'students' && (
              <div className="space-y-3 text-xs">
                {selectedGuardian.students?.length === 0 ? (
                  <p className="p-3 border rounded text-slate-400">No students currently linked to this guardian.</p>
                ) : (
                  selectedGuardian.students?.map((s) => (
                    <div key={s.id} className="p-3 border rounded bg-slate-50 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-800 flex items-center gap-2">
                          {s.student.firstName} {s.student.lastName}
                          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {s.student.studentId}
                          </span>
                          {s.isPrimary && (
                            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              PRIMARY
                            </span>
                          )}
                        </p>
                        <p className="text-slate-500 mt-0.5">
                          Relationship: <span className="font-semibold text-slate-700">{s.relationship}</span>
                          {s.relationshipDescription ? ` (${s.relationshipDescription})` : ''} • Student Status:{' '}
                          <span className="font-semibold">{s.student.status}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Audit Log */}
            {activeTab === 'audit' && (
              <div className="space-y-2 text-xs">
                {auditLogs.length === 0 ? (
                  <p className="p-3 border rounded text-slate-400">No audit logs recorded for this guardian.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-2.5 border rounded bg-slate-50 space-y-1">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span className="text-indigo-700 font-mono">{log.action}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-500 text-[10px]">Actor: {log.actor}</p>
                      <pre className="text-[10px] bg-white p-1.5 rounded border text-slate-700 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
