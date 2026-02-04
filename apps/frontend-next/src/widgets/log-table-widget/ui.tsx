'use client';

import React from 'react';
import { B2BLog } from '@/types';
import { useAnalyzeLogsWithGemini } from '@/hooks/queries';
import LogTable from '@/components/log/LogTable';

interface LogExplorerProps {
  logs: B2BLog[];
}

const LogExplorer: React.FC<LogExplorerProps> = ({ logs }) => {
  const {
    mutate: analyzeWithGemini,
    data: aiAnalysis,
    isPending: isAnalyzing,
    error: analysisError,
  } = useAnalyzeLogsWithGemini();

  return (
    <div className="p-6 h-full flex flex-col">
      <LogTable
        logs={logs}
        title="Log Explorer (BigQuery)"
        analysisResult={aiAnalysis}
        isAnalyzing={isAnalyzing}
        onAnalyze={() => analyzeWithGemini(logs.slice(0, 20) as any)}
        analysisError={analysisError?.message}
      />
    </div>
  );
};

export default LogExplorer;
