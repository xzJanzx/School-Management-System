import React, { useState } from 'react';
import { School, Plus, ShieldAlert, AlertCircle, Edit3 } from 'lucide-react';
import { ClassRoom, Grade, UserContext } from '../types/sms';

interface ClassesViewProps {
  classes: ClassRoom[];
  grades: Grade[];
  user: UserContext;
  onCreateClass: (data: { gradeId: string; code: string; name: string; capacity: number }) => void;
  onChangeCapacity: (
    classId: string,
    newCapacity: number,
    isAdministrativeOverride?: boolean,
    overrideReason?: string
  ) => void;
  onDeleteClass: (classId: string) => void;
  error?: string | null;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  grades,
  user,
  onCreateClass,
  onChangeCapacity,
  onDeleteClass,
  error,
}) => {
  const [selectedGradeId, setSelectedGradeId] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedClassForOverride, setSelectedClassForOverride] = useState<ClassRoom | null>(null);

  // New Class Form State
  const [gradeId, setGradeId] = useState(grades[0]?.id || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(30);

  // Capacity Override Form State
  const [newCapacity, setNewCapacity] = useState<number>(20);
  const [isOverride, setIsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);

  const filteredClasses = selectedGradeId === 'ALL'
    ? classes
    : classes.filter(c => c.gradeId === selectedGradeId);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      onCreateClass({ gradeId, code, name, capacity: Number(capacity) });
      setShowCreateModal(false);
      setCode('');
      setName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLocalError(msg);
    }
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!selectedClassForOverride) return;

    try {
      onChangeCapacity(
        selectedClassForOverride.id,
        Number(newCapacity),
        isOverride,
        overrideReason
      );
      setShowOverrideModal(false);
      setSelectedClassForOverride(null);
      setOverrideReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLocalError(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <School className="w-5 h-5 text-indigo-400" />
            Classes & Capacity Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Enforces <b>Class Code Uniqueness (C-06)</b>, <b>Capacity Enforcement (C-15)</b>, and <b>Administrative Override Audit (C-16..C-18)</b>.
          </p>
        </div>

        <button
          onClick={() => {
            setLocalError(null);
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Class Section</span>
        </button>
      </div>

      {(error || localError) && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error || localError}</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <span className="text-xs font-medium text-slate-400">Filter by Grade:</span>
        <select
          value={selectedGradeId}
          onChange={(e) => setSelectedGradeId(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Grades ({classes.length} Classes)</option>
          {grades.map(g => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.code})
            </option>
          ))}
        </select>
      </div>

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((cls) => {
          const parentGrade = grades.find(g => g.id === cls.gradeId);
          const utilizationPct = Math.min(100, Math.round((cls.currentEnrollmentCount / cls.capacity) * 100));
          const isAtCapacity = cls.currentEnrollmentCount >= cls.capacity;

          return (
            <div key={cls.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400">{cls.code}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      Grade: {parentGrade?.name || 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{cls.name}</h3>
                </div>

                <button
                  onClick={() => {
                    setSelectedClassForOverride(cls);
                    setNewCapacity(cls.capacity);
                    setIsOverride(false);
                    setOverrideReason('');
                    setLocalError(null);
                    setShowOverrideModal(true);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  title="Edit Class Capacity / Administrative Override"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Capacity</span>
                </button>
              </div>

              {/* Enrollment Meter */}
              <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Enrollment / Capacity:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {cls.currentEnrollmentCount} / {cls.capacity} ({utilizationPct}%)
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isAtCapacity ? 'bg-rose-500' : utilizationPct > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${utilizationPct}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                  <span>Available Seats: {Math.max(0, cls.capacity - cls.currentEnrollmentCount)}</span>
                  {isAtCapacity && (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Class Full
                    </span>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    if (confirm(`Delete Class '${cls.name}'?`)) {
                      onDeleteClass(cls.id);
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Delete Section
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Class */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create New Class Section</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Grade</label>
                <select
                  value={gradeId}
                  onChange={(e) => setGradeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Class Code (e.g. P1-C) * Must be Unique (C-06)</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Class Name (e.g. Class 1-C)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Student Capacity</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Capacity Change / Administrative Override */}
      {showOverrideModal && selectedClassForOverride && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Capacity Management: {selectedClassForOverride.name}
              </h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <div>Current Capacity: <strong className="text-white">{selectedClassForOverride.capacity}</strong></div>
              <div>Current Enrolled Students: <strong className="text-indigo-400">{selectedClassForOverride.currentEnrollmentCount}</strong></div>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Requested New Capacity</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {newCapacity < selectedClassForOverride.currentEnrollmentCount && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 space-y-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Requested capacity ({newCapacity}) is below current enrollment ({selectedClassForOverride.currentEnrollmentCount})</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This action requires <b>Administrative Capacity Override</b>, an authorized role, and an explicit reason for the audit trail.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isOverride"
                      checked={isOverride}
                      onChange={(e) => setIsOverride(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-amber-500"
                    />
                    <label htmlFor="isOverride" className="font-semibold text-amber-200 cursor-pointer">
                      Enable Administrative Capacity Override
                    </label>
                  </div>
                </div>
              )}

              {(isOverride || newCapacity < selectedClassForOverride.currentEnrollmentCount) && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Override Reason (Mandatory for Audit C-17..C-18) <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Authorized lab facility conversion requiring temporary reduced capacity..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowOverrideModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Update Capacity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
