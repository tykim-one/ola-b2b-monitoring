import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alarmScheduleApi, UpdateAlarmScheduleRequest } from '@/services/alarmScheduleService';

const QUERY_KEY = ['alarm-schedules'];

export function useAlarmSchedules() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => alarmScheduleApi.getAll(),
  });
}

export function useUpdateAlarmSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAlarmScheduleRequest }) =>
      alarmScheduleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleAlarmSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => alarmScheduleApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
