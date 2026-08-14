import React from 'react';
import { History, Shield, User } from 'lucide-react';
import { AuditRecord } from '../types/sms';

interface AuditTrailViewProps {
  records: AuditRecord[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ records }) => {
  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          Audit Trail & Structural Change Log
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Enforces <b>Auditability (C-23)</b> for structural mutations, Academic Year closures, and Administrative Capacity Overrides.
        </p>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Reason / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 whitespace-nowrap text-slate-400 font-normal">
                    {new Date(rec.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3.5 font-sans font-medium text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{rec.userName}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 font-bold">
                      {rec.entity}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        rec.action === 'CREATE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : rec.action === 'OVERRIDE_CAPACITY'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : rec.action === 'CLOSE'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {rec.action}
                    </span>
                  </td>
                  <td className="p-3.5 font-sans text-slate-300 max-w-xs truncate">
                    {rec.reason || rec.newValue || 'Standard Operation'}
                  </td>
                </tr>
              ))}

              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic font-sans">
                    No audit records captured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
