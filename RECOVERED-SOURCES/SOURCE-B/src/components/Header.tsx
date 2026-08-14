import React from 'react';
import { Building2, Shield, CalendarCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { UserContext, Role, AcademicYear } from '../types/sms';

interface HeaderProps {
  user: UserContext;
  onRoleChange: (role: Role) => void;
  activeYear?: AcademicYear;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onResetSeed: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onRoleChange,
  activeYear,
  activeTab,
  onTabChange,
  onResetSeed,
}) => {
  const tabs = [
    { id: 'transfers', label: 'Student Transfers (Module 05)' },
    { id: 'enrollment', label: 'Student Enrollment (Module 04)' },
    { id: 'years', label: 'Academic Years' },
    { id: 'stages', label: 'Stages & Grades' },
    { id: 'classes', label: 'Classes & Capacity' },
    { id: 'path', label: 'Path Validation' },
    { id: 'tree', label: 'Hierarchy Tree' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'tests', label: 'Acceptance Gates (C-01..C-40)' },
    { id: 'regression', label: 'Modules 01 & 02' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Module Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">SMS — Student Affairs</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-300 font-mono">Module 05</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">Student Transfers, Enrollment & Academic Registration</h1>
            </div>
          </div>

          {/* Active Year & Role Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Active Year Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-slate-400 block text-[10px] leading-3 uppercase font-medium">Active Year</span>
                <span className="font-semibold text-emerald-300">{activeYear ? activeYear.code : 'None Active'}</span>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400 font-medium">Role:</span>
              <select
                value={user.role}
                onChange={(e) => onRoleChange(e.target.value as Role)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="SUPER_ADMIN">Super Admin (All permissions)</option>
                <option value="ACADEMIC_ADMIN">Academic Admin</option>
                <option value="TEACHER">Teacher</option>
                <option value="VIEWER">Viewer (Read Only)</option>
              </select>
            </div>

            {/* Seed Reset Button */}
            <button
              onClick={onResetSeed}
              title="Reset default seed structure"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Seed</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 mt-4 overflow-x-auto pb-1 border-t border-slate-800 pt-2 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isTestTab = tab.id === 'tests';
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? isTestTab
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {isTestTab && <CheckCircle2 className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
