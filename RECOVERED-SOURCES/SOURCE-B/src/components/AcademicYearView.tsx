import React, { useState } from 'react';
import { Plus, CheckCircle, Lock, Calendar, AlertCircle } from 'lucide-react';
import { AcademicYear, UserContext } from '../types/sms';

interface AcademicYearViewProps {
  years: AcademicYear[];
  user: UserContext;
  onCreateYear: (data: { code: string; name: string; startDate: string; endDate: string; isActive?: boolean }) => void;
  onActivateYear: (yearId: string) => void;
  onCloseYear: (yearId: string) => void;
  error?: string | null;
}

export const AcademicYearView: React.FC<AcademicYearViewProps> = ({
  years,
  user,
  onCreateYear,
  onActivateYear,
  onCloseYear,
  error,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('2026/2027');
  const [name, setName] = useState('Academic Year 2026/2027');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2027-06-30');
  const [isActive, setIsActive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      onCreateYear({ code, name, startDate, endDate, isActive });
      setShowModal(false);
      setCode('');
      setName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header / Intro Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Academic Year Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Enforces strict <b>Uniqueness (C-01)</b>, <b>Maximum One Active Year (C-02)</b>, and <b>Historical Preservation (C-03)</b>.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Academic Year</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Academic Years */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {years.map((year) => (
          <div
            key={year.id}
            className={`p-5 rounded-2xl border transition-all ${
              year.isActive
                ? 'bg-gradient-to-b from-slate-900 to-indigo-950/30 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                : year.isClosed
                ? 'bg-slate-900/60 border-slate-800/80 opacity-75'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-mono text-indigo-400 uppercase tracking-wide font-semibold block">
                  Code: {year.code}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{year.name}</h3>
              </div>

              {/* Status Badge */}
              {year.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Active
                </span>
              ) : year.isClosed ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  Closed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                  Inactive
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-slate-400 mb-5 border-t border-slate-800/80 pt-3">
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span className="text-slate-200 font-mono">{year.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span>End Date:</span>
                <span className="text-slate-200 font-mono">{year.endDate}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              {!year.isActive && !year.isClosed && (
                <button
                  onClick={() => onActivateYear(year.id)}
                  className="flex-1 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center"
                >
                  Activate Year
                </button>
              )}

              {!year.isClosed && (
                <button
                  onClick={() => onCloseYear(year.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Close Year
                </button>
              )}

              {year.isClosed && (
                <span className="text-xs text-slate-500 italic">
                  Historical Record Preserved (Closed)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Creation */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create Academic Year</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Year Code (e.g. 2026/2027) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Year Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="makeActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="makeActive" className="text-slate-300 font-medium cursor-pointer">
                  Set as Active Academic Year (Deactivates previous active year)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Save Academic Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
