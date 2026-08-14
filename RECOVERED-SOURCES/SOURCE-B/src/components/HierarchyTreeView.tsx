import React from 'react';
import { GitBranch, Layers, BookOpen, School, Users } from 'lucide-react';
import { AcademicStage, Grade, ClassRoom } from '../types/sms';

interface HierarchyTreeViewProps {
  stages: AcademicStage[];
  grades: Grade[];
  classes: ClassRoom[];
}

export const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  stages,
  grades,
  classes,
}) => {
  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          Academic Structure Hierarchy Tree
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Visual representation of <b>Stage → Grade → Class Section</b> nesting (C-04 & C-05).
        </p>
      </div>

      {/* Tree Container */}
      <div className="space-y-6">
        {stages.map((stage) => {
          const stageGrades = grades.filter(g => g.stageId === stage.id);

          return (
            <div key={stage.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              {/* Stage Node */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{stage.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400">
                      {stage.code}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Sequence Order: {stage.sequence}</span>
                </div>
              </div>

              {/* Grades Children */}
              <div className="pl-4 sm:pl-8 space-y-4 border-l-2 border-slate-800 ml-4">
                {stageGrades.map((grade) => {
                  const gradeClasses = classes.filter(c => c.gradeId === grade.id);

                  return (
                    <div key={grade.id} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
                      {/* Grade Node */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-purple-400" />
                          <span className="font-semibold text-slate-200 text-sm">{grade.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({grade.code})</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">Sequence: {grade.sequence}</span>
                      </div>

                      {/* Class Children */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/60">
                        {gradeClasses.map((cls) => (
                          <div
                            key={cls.id}
                            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <School className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="font-medium text-slate-300">{cls.name}</span>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                              <Users className="w-3 h-3 text-slate-500" />
                              <span>{cls.currentEnrollmentCount}/{cls.capacity}</span>
                            </div>
                          </div>
                        ))}

                        {gradeClasses.length === 0 && (
                          <span className="text-xs text-slate-500 italic py-1">No class sections</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {stageGrades.length === 0 && (
                  <span className="text-xs text-slate-500 italic">No grades assigned to this stage</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
