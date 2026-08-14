import React, { useState } from 'react';
import { Compass, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Grade, PathValidationResult } from '../types/sms';

interface PathValidationViewProps {
  grades: Grade[];
  onValidatePath: (fromGradeId: string, toGradeId: string) => PathValidationResult;
}

export const PathValidationView: React.FC<PathValidationViewProps> = ({
  grades,
  onValidatePath,
}) => {
  const [fromGradeId, setFromGradeId] = useState<string>(grades[1]?.id || grades[0]?.id || ''); // KG2
  const [toGradeId, setToGradeId] = useState<string>(grades[2]?.id || grades[0]?.id || '');   // P1

  const validationResult = onValidatePath(fromGradeId, toGradeId);

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400" />
          Academic Progression & Path Validation Rules
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Enforces <b>Academic Progression Rules (03.02.06 / C-12..C-14)</b>. Progression is data-driven by sequence ordering. Block invalid jumps like <b>KG2 → Secondary</b>.
        </p>
      </div>

      {/* Simulator Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Progression Path Simulator
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {/* From Grade */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Current Grade (From)</label>
            <select
              value={fromGradeId}
              onChange={(e) => setFromGradeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500"
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code}) [Seq: {g.sequence}]
                </option>
              ))}
            </select>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center pt-4 md:pt-0">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* To Grade */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Target Grade (To)</label>
            <select
              value={toGradeId}
              onChange={(e) => setToGradeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500"
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code}) [Seq: {g.sequence}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Validation Result Box */}
        <div
          className={`p-5 rounded-xl border transition-all ${
            validationResult.isValid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {validationResult.isValid ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            )}

            <div className="space-y-1">
              <h4 className="font-bold text-base">
                {validationResult.isValid
                  ? 'VALID ACADEMIC PROGRESSION PATH'
                  : 'INVALID ACADEMIC STAGE JUMP REJECTED'}
              </h4>
              <p className="text-xs leading-relaxed opacity-90">
                {validationResult.isValid
                  ? `Students are permitted to promote from ${validationResult.fromGradeName} (${validationResult.fromStageName}) to ${validationResult.toGradeName} (${validationResult.toStageName}).`
                  : validationResult.reason}
              </p>
            </div>
          </div>
        </div>

        {/* Preset Quick Tests */}
        <div className="space-y-2 border-t border-slate-800 pt-4">
          <span className="text-xs font-semibold text-slate-400 block">Try Approved Business Rule Presets:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const kg2 = grades.find(g => g.code === 'KG2');
                const p1 = grades.find(g => g.code === 'PRIM1');
                if (kg2 && p1) {
                  setFromGradeId(kg2.id);
                  setToGradeId(p1.id);
                }
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
            >
              ✓ Valid: KG2 → Primary Grade 1
            </button>

            <button
              onClick={() => {
                const p6 = grades.find(g => g.code === 'PRIM6');
                const prep1 = grades.find(g => g.code === 'PREP1');
                if (p6 && prep1) {
                  setFromGradeId(p6.id);
                  setToGradeId(prep1.id);
                }
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
            >
              ✓ Valid: Primary 6 → Prep Grade 1
            </button>

            <button
              onClick={() => {
                const kg2 = grades.find(g => g.code === 'KG2');
                const sec1 = grades.find(g => g.code === 'SEC1');
                if (kg2 && sec1) {
                  setFromGradeId(kg2.id);
                  setToGradeId(sec1.id);
                }
              }}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-medium cursor-pointer"
            >
              ✕ Invalid Jump: KG2 → Secondary 1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
