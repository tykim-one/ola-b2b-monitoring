import { useMutation } from '@tanstack/react-query';
import { analyzeLogs } from '@/services/geminiService';
import type { B2BLog } from '@/types';

export const logAnalysisKeys = {
  all: ['log-analysis'] as const,
};

export function useAnalyzeLogsWithGemini() {
  return useMutation({
    mutationFn: (logs: B2BLog[]) => analyzeLogs(logs),
  });
}
