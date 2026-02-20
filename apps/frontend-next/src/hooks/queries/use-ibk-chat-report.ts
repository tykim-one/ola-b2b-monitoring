import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import apiClient from '@/lib/api-client';

const REPORT_API = '/projects/ibks/api/ibk-chat-report';

interface IbkChatReportSummary {
  id: string;
  targetDate: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  rowCount: number | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface IbkChatReportDetail extends IbkChatReportSummary {
  reportMarkdown: string | null;
  reportMetadata: string | null;
  errorMessage: string | null;
  startedAt: string | null;
}

interface ListReportsResponse {
  reports: IbkChatReportSummary[];
  total: number;
}

interface ReportStats {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  running: number;
}

export const ibkChatReportKeys = {
  all: ['ibk-chat-report'] as const,
  list: (params?: Record<string, unknown>) =>
    [...ibkChatReportKeys.all, 'list', params] as const,
  detail: (date: string) =>
    [...ibkChatReportKeys.all, 'detail', date] as const,
  stats: () => [...ibkChatReportKeys.all, 'stats'] as const,
};

export function useIbkChatReports(params?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ibkChatReportKeys.list(params as Record<string, unknown>),
    queryFn: async () => {
      const response = await apiClient.get<ListReportsResponse>(REPORT_API, {
        params: {
          ...(params?.startDate && { startDate: params.startDate }),
          ...(params?.endDate && { endDate: params.endDate }),
          ...(params?.status && { status: params.status }),
          ...(params?.limit && { limit: params.limit }),
        },
      });
      return response.data;
    },
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useIbkChatReport(date: string | null) {
  return useQuery({
    queryKey: ibkChatReportKeys.detail(date ?? ''),
    queryFn: async () => {
      const response = await apiClient.get<IbkChatReportDetail>(
        `${REPORT_API}/${date}`,
      );
      return response.data;
    },
    enabled: !!date,
    staleTime: CACHE_TIME.MEDIUM,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' || status === 'PENDING' ? 5000 : false;
    },
  });
}

export function useIbkChatReportStats() {
  return useQuery({
    queryKey: ibkChatReportKeys.stats(),
    queryFn: async () => {
      const response = await apiClient.get<ReportStats>(
        `${REPORT_API}/stats`,
      );
      return response.data;
    },
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useGenerateIbkChatReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { targetDate: string; force?: boolean }) => {
      const response = await apiClient.post(`${REPORT_API}/generate`, params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ibkChatReportKeys.all,
      });
    },
  });
}
