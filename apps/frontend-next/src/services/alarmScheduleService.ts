import apiClient from '@/lib/api-client';

export interface AlarmSchedule {
  id: number;
  module: string;
  name: string;
  description: string | null;
  cronExpression: string;
  timezone: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  nextExecution: string | null;
  isRunning: boolean;
}

export interface UpdateAlarmScheduleRequest {
  cronExpression?: string;
  timezone?: string;
  isEnabled?: boolean;
  name?: string;
  description?: string;
}

export const alarmScheduleApi = {
  async getAll(): Promise<AlarmSchedule[]> {
    const response = await apiClient.get('/api/admin/alarm-schedules');
    return response.data.data;
  },

  async update(id: number, data: UpdateAlarmScheduleRequest): Promise<AlarmSchedule> {
    const response = await apiClient.patch(`/api/admin/alarm-schedules/${id}`, data);
    return response.data.data;
  },

  async toggle(id: number): Promise<AlarmSchedule> {
    const response = await apiClient.post(`/api/admin/alarm-schedules/${id}/toggle`);
    return response.data.data;
  },
};
