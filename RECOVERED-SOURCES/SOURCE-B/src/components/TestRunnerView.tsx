import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Play, ShieldAlert, Sparkles, Loader2, Database } from 'lucide-react';
import { TestResult } from '../tests/smsModule03TestSuite';

interface TestRunnerViewProps {
  onRunTests: () => Promise<TestResult[]>;
}

export const TestRunnerView: React.FC<TestRunnerViewProps> = ({ onRunTests }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const results = await onRunTests();
      setTestResults(results);
    } catch (err: unknown) {
      console.error('Test execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRun();
  }, []);

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Critical Acceptance Gates Verification (C-01..C-26)
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automated test suite executing against an <strong className="text-indigo-400">ISOLATED SQLite test database (test_sms.db)</strong> to protect operational application data.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{loading ? 'Running Suite...' : 'Execute Acceptance Suite'}</span>
        </button>
      </div>

      {/* Summary Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total Acceptance Gates</span>
            <span className="text-2xl font-bold text-white font-mono">{totalCount}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Gates Passed</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">{passedCount}</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Gates Failed</span>
            <span className={`text-2xl font-bold font-mono ${totalCount - passedCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
              {totalCount - passedCount}
            </span>
          </div>
          <XCircle className="w-8 h-8 text-rose-500/30" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Database Isolation</span>
            <span className="text-xs font-bold text-indigo-400 font-mono flex items-center gap-1 mt-1">
              <Database className="w-3.5 h-3.5" /> Isolated SQLite
            </span>
          </div>
        </div>
      </div>

      {/* Test Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Gate Code</th>
                <th className="p-3.5">Gate Description</th>
                <th className="p-3.5">Real DB</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Verification Result / Audit Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {testResults.map((res) => (
                <tr key={res.code} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 font-bold text-indigo-400 whitespace-nowrap">{res.code}</td>
                  <td className="p-3.5 font-sans font-semibold text-slate-100">{res.name}</td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                      SQLite
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {res.passed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-sans text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-sans text-xs font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        FAILED
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-sans text-slate-300 max-w-md">{res.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
