'use client';

import React from 'react';
import type { B2BLog } from '@/types';
import { DataTable, Column } from '@/components/compound/DataTable';

interface LogTableProps {
  logs: B2BLog[];
  title?: string;
  analysisResult?: string | null;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  analysisError?: string | null;
}

const formatTime = (ts: string | { value: string } | undefined) => {
  if (!ts) return '-';
  const val = typeof ts === 'string' ? ts : ts.value;
  try {
    return new Date(val).toLocaleString();
  } catch {
    return val;
  }
};

const columns: Column<B2BLog>[] = [
  {
    key: 'timestamp',
    header: 'Time',
    render: (_, row) => (
      <span className="text-gray-500 whitespace-nowrap font-mono" suppressHydrationWarning>
        {formatTime(row.timestamp)}
      </span>
    ),
  },
  {
    key: 'tenant_id',
    header: 'Tenant',
    render: (_, row) => (
      <span className="bg-white px-2 py-1 rounded text-xs border border-gray-200">
        {row.tenant_id}
      </span>
    ),
  },
  {
    key: 'user_input',
    header: 'User Input',
    render: (_, row) => (
      <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
        {row.user_input}
      </div>
    ),
  },
  {
    key: 'llm_response',
    header: 'LLM Response',
    render: (_, row) => (
      <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar text-gray-500">
        {row.llm_response}
      </div>
    ),
  },
];

const GeminiIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path d="M9 10a.5.5 0 00-1 0V9a.5.5 0 00-1 0v3a.5.5 0 001 0v-1a.5.5 0 001 0v1a.5.5 0 001 0v-3a.5.5 0 00-1 0v1zM14.5 13.5L17 11l-2.5-2.5" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function LogTable({
  logs,
  title = 'Log Explorer',
  analysisResult,
  isAnalyzing,
  onAnalyze,
  analysisError,
}: LogTableProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {onAnalyze && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-gray-900 px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {isAnalyzing ? <SpinnerIcon /> : <GeminiIcon />}
            Analyze with Gemini
          </button>
        )}
      </div>

      {/* Analysis Result */}
      {analysisResult && (
        <div className="bg-white border border-purple-500/30 rounded-lg p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-purple-400">✨</span>
            <h3 className="text-purple-300 font-semibold">Gemini Insight</h3>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-gray-600 whitespace-pre-line">
            {analysisResult}
          </div>
        </div>
      )}

      {/* Analysis Error */}
      {analysisError && (
        <div className="bg-white border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-400">⚠️</span>
            <h3 className="text-red-300 font-semibold">Analysis Error</h3>
          </div>
          <div className="text-gray-600 text-sm">{analysisError}</div>
        </div>
      )}

      {/* DataTable */}
      <div className="flex-1 overflow-hidden">
        <DataTable
          data={logs}
          columns={columns}
          searchFields={['user_input', 'tenant_id', 'llm_response']}
        >
          <DataTable.Toolbar>
            <DataTable.Search placeholder="Search by User Input, Tenant, or Response..." />
          </DataTable.Toolbar>
          <DataTable.Content>
            <DataTable.Header />
            <DataTable.Body emptyMessage="No logs found matching your criteria." />
          </DataTable.Content>
          <DataTable.Footer />
        </DataTable>
      </div>
    </div>
  );
}

export type { LogTableProps };
