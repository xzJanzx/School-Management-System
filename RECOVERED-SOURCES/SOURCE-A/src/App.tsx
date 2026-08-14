/**
 * SMS — Minimal Functional Shell
 * Used solely to verify system foundation health.
 */

import { useEffect, useState } from 'react';
import { SYSTEM_CONFIG } from './config/index.js';
import { StudentMasterDataUI } from './components/StudentMasterDataUI.js';
import { GuardianMasterUI } from './components/GuardianMasterUI.js';

interface HealthResponse {
  status: string;
  message: string;
  system: string;
  version: string;
  copyright: {
    notice: string;
    email: string;
    phone: string;
  };
  timestamp: string;
  uptimeSeconds: number;
  database: {
    connected: boolean;
    engine: string;
    latencyMs: number;
    error?: string;
  };
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activeModule, setActiveModule] = useState<'students' | 'guardians'>('students');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Application Header */}
        <header className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{SYSTEM_CONFIG.name}</h1>
            <p className="text-xs text-slate-500">School Management System Baseline Architecture</p>
          </div>
          {health && (
            <div className="flex items-center gap-3 text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${health.database.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                DB: {health.database.engine} ({health.database.latencyMs}ms)
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">Ver: {health.version}</span>
            </div>
          )}
        </header>

        {/* Module Navigation Tabs */}
        <div className="flex bg-white rounded-lg border border-slate-200 p-1 text-xs font-semibold w-fit shadow-sm">
          <button
            onClick={() => setActiveModule('students')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeModule === 'students'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Module 01: Student Master Data
          </button>
          <button
            onClick={() => setActiveModule('guardians')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeModule === 'guardians'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Module 02: Parent / Guardian Master
          </button>
        </div>

        {/* Active Module Rendering */}
        {activeModule === 'students' && <StudentMasterDataUI />}
        {activeModule === 'guardians' && <GuardianMasterUI />}

        {/* System Footer */}
        <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-200">
          <p>{SYSTEM_CONFIG.copyright.notice} • Email: {SYSTEM_CONFIG.copyright.email} • Tel: {SYSTEM_CONFIG.copyright.phone}</p>
        </footer>
      </div>
    </div>
  );
}
