import React, { useState } from 'react';
import { B2BLog, LogLevel } from '../types';
import { analyzeLogs } from '../services/geminiService';

interface LogExplorerProps {
  logs: B2BLog[];
}

const LogExplorer: React.FC<LogExplorerProps> = ({ logs }) => {
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesText = 
      log.message.toLowerCase().includes(filter.toLowerCase()) || 
      log.partnerId.toLowerCase().includes(filter.toLowerCase()) ||
      log.traceId.toLowerCase().includes(filter.toLowerCase());
    
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    
    return matchesText && matchesLevel;
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      // Analyze currently filtered logs (top 20)
      const result = await analyzeLogs(filteredLogs.slice(0, 20));
      setAiAnalysis(result);
    } catch (e) {
      setAiAnalysis("Error running analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Log Explorer (BigQuery)</h2>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M9 10a.5.5 0 00-1 0V9a.5.5 0 00-1 0v3a.5.5 0 001 0v-1a.5.5 0 001 0v1a.5.5 0 001 0v-3a.5.5 0 00-1 0v1zM14.5 13.5L17 11l-2.5-2.5"/></svg>
          )}
          Analyze with Gemini
        </button>
      </div>

      {/* Analysis Result Box */}
      {aiAnalysis && (
        <div className="bg-slate-800 border border-purple-500/30 rounded-lg p-6 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
             <span className="text-purple-400">✨</span>
             <h3 className="text-purple-300 font-semibold">Gemini Insight</h3>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line">
            {aiAnalysis}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by Trace ID, Partner, or Message..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2 pl-10 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
          <span className="absolute left-3 top-2.5 text-slate-500">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </span>
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'ALL')}
          className="bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Levels</option>
          <option value={LogLevel.INFO}>INFO</option>
          <option value={LogLevel.WARN}>WARN</option>
          <option value={LogLevel.ERROR}>ERROR</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950 sticky top-0 z-10">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Level</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Service</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Partner</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Message</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/50 transition-colors group">
                <td className="p-4 text-slate-400 text-sm whitespace-nowrap font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    log.level === LogLevel.ERROR ? 'bg-red-500/20 text-red-400' :
                    log.level === LogLevel.WARN ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {log.level}
                  </span>
                </td>
                <td className="p-4 text-slate-300 text-sm">{log.service}</td>
                <td className="p-4 text-slate-300 text-sm">{log.partnerId}</td>
                <td className="p-4 text-slate-300 text-sm max-w-md truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:bg-slate-800 group-hover:relative group-hover:z-20">
                  {log.message}
                  <div className="text-xs text-slate-500 mt-1">Trace: {log.traceId}</div>
                </td>
                <td className="p-4 text-slate-400 text-sm font-mono text-right">{Math.round(log.latencyMs)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            No logs found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default LogExplorer;
