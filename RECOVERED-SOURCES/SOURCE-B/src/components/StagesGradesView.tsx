import React, { useState } from 'react';
import { Layers, Plus, Trash2, AlertCircle } from 'lucide-react';
import { AcademicStage, Grade, UserContext } from '../types/sms';

interface StagesGradesViewProps {
  stages: AcademicStage[];
  grades: Grade[];
  user: UserContext;
  onCreateStage: (data: { code: string; name: string; sequence: number }) => void;
  onCreateGrade: (data: { stageId: string; code: string; name: string; sequence: number }) => void;
  onDeleteStage: (stageId: string) => void;
  onDeleteGrade: (gradeId: string) => void;
  error?: string | null;
}

export const StagesGradesView: React.FC<StagesGradesViewProps> = ({
  stages,
  grades,
  onCreateStage,
  onCreateGrade,
  onDeleteStage,
  onDeleteGrade,
  error,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || '');
  const [showStageModal, setShowStageModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);

  // Stage form state
  const [stageCode, setStageCode] = useState('');
  const [stageName, setStageName] = useState('');
  const [stageSeq, setStageSeq] = useState(6);

  // Grade form state
  const [gradeCode, setGradeCode] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [gradeSeq, setGradeSeq] = useState(15);

  const [localError, setLocalError] = useState<string | null>(null);

  const handleStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      onCreateStage({ code: stageCode, name: stageName, sequence: Number(stageSeq) });
      setShowStageModal(false);
      setStageCode('');
      setStageName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLocalError(msg);
    }
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      onCreateGrade({
        stageId: selectedStageId,
        code: gradeCode,
        name: gradeName,
        sequence: Number(gradeSeq)
      });
      setShowGradeModal(false);
      setGradeCode('');
      setGradeName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLocalError(msg);
    }
  };

  const currentStage = stages.find(s => s.id === selectedStageId) || stages[0];
  const stageGrades = grades.filter(g => g.stageId === currentStage?.id);

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Stages & Grades Hierarchy
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            <b>Baby Class</b> is a separate stage. <b>KG1</b> and <b>KG2</b> belong to the <b>KG</b> stage. Grade-to-Stage integrity enforced by <b>C-04</b>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLocalError(null);
              setShowStageModal(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Stage</span>
          </button>
          <button
            onClick={() => {
              setLocalError(null);
              setShowGradeModal(true);
            }}
            disabled={!currentStage}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Grade in {currentStage?.name}</span>
          </button>
        </div>
      </div>

      {(error || localError) && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error || localError}</span>
        </div>
      )}

      {/* Main Layout: Stages on Left, Grades on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stages List Column */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Configured Stages ({stages.length})
          </h3>
          <div className="space-y-2">
            {stages.map((stg) => {
              const isSelected = stg.id === (currentStage?.id);
              const gCount = grades.filter(g => g.stageId === stg.id).length;

              return (
                <div
                  key={stg.id}
                  onClick={() => setSelectedStageId(stg.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400 font-bold">
                        {stg.code}
                      </span>
                      <span className="font-bold text-sm">{stg.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Sequence: {stg.sequence} • {gCount} Grade{gCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete Stage '${stg.name}'?`)) {
                        onDeleteStage(stg.id);
                      }
                    }}
                    title="Delete stage (Requires zero grades)"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grades Column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Grades under Stage: <span className="text-indigo-400">{currentStage?.name}</span> ({stageGrades.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stageGrades.map((grd) => (
              <div
                key={grd.id}
                className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 relative group hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">
                      Code: {grd.code}
                    </span>
                    <h4 className="font-bold text-slate-100 text-base">{grd.name}</h4>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete Grade '${grd.name}'?`)) {
                        onDeleteGrade(grd.id);
                      }
                    }}
                    title="Delete grade (Requires zero classes)"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
                  <span>Sequence Order: <strong className="text-slate-200">{grd.sequence}</strong></span>
                  <span className="text-emerald-400 font-medium">Active</span>
                </div>
              </div>
            ))}

            {stageGrades.length === 0 && (
              <div className="sm:col-span-2 p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                No Grades defined under stage '{currentStage?.name}'. Click "New Grade" to add one.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Stage Creation */}
      {showStageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create Academic Stage</h3>
              <button onClick={() => setShowStageModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleStageSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Stage Code (e.g. PRIM)</label>
                <input
                  type="text"
                  required
                  value={stageCode}
                  onChange={(e) => setStageCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Stage Name (e.g. Primary)</label>
                <input
                  type="text"
                  required
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Sequence Order</label>
                <input
                  type="number"
                  required
                  value={stageSeq}
                  onChange={(e) => setStageSeq(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowStageModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Save Stage</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Grade Creation */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create Grade in Stage {currentStage?.name}</h3>
              <button onClick={() => setShowGradeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleGradeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Grade Code (e.g. PRIM1)</label>
                <input
                  type="text"
                  required
                  value={gradeCode}
                  onChange={(e) => setGradeCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Grade Name (e.g. Grade 1)</label>
                <input
                  type="text"
                  required
                  value={gradeName}
                  onChange={(e) => setGradeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Sequence Order</label>
                <input
                  type="number"
                  required
                  value={gradeSeq}
                  onChange={(e) => setGradeSeq(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowGradeModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Save Grade</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
