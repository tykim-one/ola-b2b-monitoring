import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import {
  batchAnalysisApi,
  BatchSchedulerConfig,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  AnalysisPromptTemplate,
  TenantInfo,
} from '@/services/batchAnalysisService';

// ==================== Query Keys ====================

export const batchScheduleKeys = {
  all: ['batch-schedules'] as const,
  schedules: () => [...batchScheduleKeys.all, 'list'] as const,
  schedule: (id: string) => [...batchScheduleKeys.all, id] as const,
  templates: () => [...batchScheduleKeys.all, 'templates'] as const,
  tenants: (days?: number) => [...batchScheduleKeys.all, 'tenants', days] as const,
};

// ==================== Query Hooks ====================

export function useSchedules(
  options?: Omit<UseQueryOptions<BatchSchedulerConfig[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: batchScheduleKeys.schedules(),
    queryFn: () => batchAnalysisApi.listSchedules(),
    ...options,
  });
}

export function useScheduleTemplates(
  options?: Omit<UseQueryOptions<AnalysisPromptTemplate[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: batchScheduleKeys.templates(),
    queryFn: async () => {
      const templates = await batchAnalysisApi.listPromptTemplates();
      return templates.filter((t) => t.isActive);
    },
    ...options,
  });
}

export function useScheduleTenants(
  days: number = 30,
  options?: Omit<UseQueryOptions<TenantInfo[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: batchScheduleKeys.tenants(days),
    queryFn: async () => {
      const result = await batchAnalysisApi.getAvailableTenants(days);
      return result.tenants;
    },
    ...options,
  });
}

// ==================== Mutation Hooks ====================

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleRequest) => batchAnalysisApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchScheduleKeys.schedules() });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleRequest }) =>
      batchAnalysisApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchScheduleKeys.schedules() });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => batchAnalysisApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchScheduleKeys.schedules() });
    },
  });
}

export function useToggleSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => batchAnalysisApi.toggleSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchScheduleKeys.schedules() });
    },
  });
}
