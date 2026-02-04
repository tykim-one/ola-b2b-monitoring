import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import {
  sessionAnalysisApi,
  type SessionTimeline,
  type LLMSessionAnalysis,
} from '@/services/sessionAnalysisService';

export const sessionAnalysisKeys = {
  all: ['session-analysis'] as const,
  timeline: (sessionId: string) =>
    [...sessionAnalysisKeys.all, 'timeline', sessionId] as const,
};

export function useSessionTimeline(
  sessionId: string,
  options?: Omit<UseQueryOptions<SessionTimeline>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: sessionAnalysisKeys.timeline(sessionId),
    queryFn: () => sessionAnalysisApi.getTimeline(sessionId),
    staleTime: CACHE_TIME.SHORT,
    enabled: !!sessionId,
    ...options,
  });
}

export function useAnalyzeSessionWithLLM() {
  return useMutation({
    mutationFn: (sessionId: string) => sessionAnalysisApi.analyzeWithLLM(sessionId),
  });
}
