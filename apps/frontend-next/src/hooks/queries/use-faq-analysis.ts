import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import {
  getFAQTenants,
  runFAQAnalysis,
  type FAQAnalysisRequest,
  type FAQAnalysisResponse,
} from '@/services/faqAnalysisService';

export const faqAnalysisKeys = {
  all: ['faq-analysis'] as const,
  tenants: (days?: number) =>
    [...faqAnalysisKeys.all, 'tenants', { days }] as const,
};

export function useFAQTenants(
  days?: number,
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: faqAnalysisKeys.tenants(days),
    queryFn: () => getFAQTenants(days),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

export function useRunFAQAnalysis() {
  return useMutation({
    mutationFn: (request: FAQAnalysisRequest) => runFAQAnalysis(request),
  });
}
