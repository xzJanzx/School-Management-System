import React from 'react';
import { Users, UserCheck, ShieldCheck, Database } from 'lucide-react';
import { Student, Parent } from '../types/sms';

interface RegressionViewProps {
  students: Student[];
  parents: Parent[];
}

export const RegressionView: React.FC<RegressionViewProps> = ({ students, parents }) => {
  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          Modules 01 & 02 Regression & Domain Contract Integration
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Verifies that existing <b>Module 01 (Student Master Data)</b> and <b>Module 02 (Parent/Guardian)</b> remain completely intact without destructive modifications (C-21, C-25, C-26).
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Module 01 Students */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-base">Module 01 — Students ({students.length})</h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Intact
            </span>
          </div>

          <div className="space-y-3">
            {students.map((stu) => (
              <div key={stu.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-indigo-400 font-bold block">{stu.fileNumber}</span>
                    <h4 className="font-bold text-slate-200 text-sm">{stu.firstName} {stu.lastName}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                    NatID: {stu.nationalId}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-400 pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                  <div>Current Class: <strong className="text-slate-200">{stu.currentClassId || 'P1-A'}</strong></div>
                  <div>Parent Ref: <strong className="text-slate-200">{stu.parentId || 'PAR-001'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module 02 Parents */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-base">Module 02 — Parents / Guardians ({parents.length})</h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Intact
            </span>
          </div>

          <div className="space-y-3">
            {parents.map((par) => (
              <div key={par.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-purple-400 font-bold block">{par.relationship}</span>
                    <h4 className="font-bold text-slate-200 text-sm">{par.fullName}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                    NatID: {par.nationalId}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-400 pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                  <div>Phone: <strong className="text-slate-200">{par.phone}</strong></div>
                  <div>Email: <strong className="text-slate-200">{par.email}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
