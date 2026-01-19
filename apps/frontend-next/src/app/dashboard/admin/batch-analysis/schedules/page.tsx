'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Clock, Calendar, ArrowLeft } from 'lucide-react';
import {
  batchAnalysisApi,
  BatchSchedulerConfig,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  AnalysisPromptTemplate,
  TenantInfo,
} from '@/services/batchAnalysisService';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ScheduleFormModal from './components/ScheduleFormModal';

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<BatchSchedulerConfig[]>([]);
  const [templates, setTemplates] = useState<AnalysisPromptTemplate[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<BatchSchedulerConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<BatchSchedulerConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesData, templatesData, tenantsData] = await Promise.all([
        batchAnalysisApi.listSchedules(),
        batchAnalysisApi.listPromptTemplates(),
        batchAnalysisApi.getAvailableTenants(30),
      ]);
      setSchedules(schedulesData);
      setTemplates(templatesData.filter((t) => t.isActive));
      setTenants(tenantsData.tenants);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSchedule = () => {
    setSelectedSchedule(null);
    setIsFormOpen(true);
  };

  const handleEditSchedule = (schedule: BatchSchedulerConfig) => {
    setSelectedSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (schedule: BatchSchedulerConfig) => {
    setScheduleToDelete(schedule);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;

    try {
      setIsDeleting(true);
      await batchAnalysisApi.deleteSchedule(scheduleToDelete.id);
      setSchedules(schedules.filter((s) => s.id !== scheduleToDelete.id));
      setIsDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete schedule');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = (schedule: BatchSchedulerConfig) => {
    if (selectedSchedule) {
      // Update
      setSchedules(schedules.map((s) => (s.id === schedule.id ? schedule : s)));
    } else {
      // Create
      setSchedules([...schedules, schedule]);
    }
    setIsFormOpen(false);
    setSelectedSchedule(null);
  };

  const handleToggleEnabled = async (schedule: BatchSchedulerConfig) => {
    try {
      const updated = await batchAnalysisApi.toggleSchedule(schedule.id);
      setSchedules(schedules.map((s) => (s.id === schedule.id ? updated : s)));
    } catch (err: any) {
      alert(err.message || 'Failed to toggle schedule');
    }
  };

  const formatDaysOfWeek = (daysOfWeek: string): string => {
    const days = daysOfWeek.split(',').map((d) => parseInt(d.trim())).sort();

    // Check for weekdays (Mon-Fri: 1,2,3,4,5)
    if (days.length === 5 && days.join(',') === '1,2,3,4,5') {
      return '평일';
    }

    // Check for everyday (0,1,2,3,4,5,6)
    if (days.length === 7) {
      return '매일';
    }

    // Map to Korean day names
    const dayNames: Record<number, string> = {
      0: '일',
      1: '월',
      2: '화',
      3: '수',
      4: '목',
      5: '금',
      6: '토',
    };

    return days.map((d) => dayNames[d]).join(', ');
  };

  const formatTime = (hour: number, minute: number, daysOfWeek: string): string => {
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const daysStr = formatDaysOfWeek(daysOfWeek);
    return `${timeStr} (${daysStr})`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-mono uppercase tracking-wider text-sm">
            Loading System Data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/admin/batch-analysis')}
              className="
                p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700
                text-slate-400 hover:text-slate-200 transition-all
              "
              title="Back to Batch Analysis"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-mono font-bold text-violet-400 uppercase tracking-wider mb-2">
                배치 분석 스케줄 관리
              </h1>
              <p className="text-slate-400 font-mono text-sm">
                SYSTEM.ADMIN.SCHEDULES // {schedules.length} CONFIGURED
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateSchedule}
            className="
              flex items-center gap-2 px-6 py-3
              bg-violet-600 hover:bg-violet-700 border-2 border-violet-500
              text-white font-mono font-bold uppercase tracking-wider text-sm
              transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40
            "
          >
            <Plus className="w-5 h-5" />
            새 스케줄 추가
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border-2 border-red-500/50 bg-red-950/30">
          <p className="text-red-400 font-mono text-sm">ERROR: {error}</p>
        </div>
      )}

      {/* Schedules Table */}
      <div className="border-2 border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-950/50">
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">
                  이름
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">
                  실행 시간
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">
                  대상 Tenant
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">
                  샘플 수
                </th>
                <th className="text-right px-6 py-4 font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Clock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-mono text-sm">NO SCHEDULES CONFIGURED</p>
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr
                    key={schedule.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Status */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleEnabled(schedule)}
                        className={`
                          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                          ${schedule.isEnabled ? 'bg-green-600' : 'bg-slate-700'}
                        `}
                      >
                        <span
                          className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                            ${schedule.isEnabled ? 'translate-x-6' : 'translate-x-1'}
                          `}
                        />
                      </button>
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-violet-400" />
                        <span className="text-slate-100 font-medium">{schedule.name}</span>
                      </div>
                    </td>

                    {/* Schedule Time */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-slate-300 font-mono text-sm">
                          {formatTime(schedule.hour, schedule.minute, schedule.daysOfWeek)}
                        </span>
                      </div>
                    </td>

                    {/* Target Tenant */}
                    <td className="px-6 py-4">
                      <span className="text-slate-300 font-mono text-sm">
                        {schedule.targetTenantId || '전체'}
                      </span>
                    </td>

                    {/* Sample Size */}
                    <td className="px-6 py-4">
                      <span className="text-slate-300 font-mono text-sm">
                        {schedule.sampleSize}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditSchedule(schedule)}
                          className="
                            p-2 bg-slate-800 hover:bg-violet-600/20 border border-slate-700 hover:border-violet-500/50
                            text-slate-400 hover:text-violet-400 transition-all
                          "
                          title="Edit Schedule"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(schedule)}
                          className="
                            p-2 bg-slate-800 hover:bg-red-600/20 border border-slate-700 hover:border-red-500/50
                            text-slate-400 hover:text-red-400 transition-all
                          "
                          title="Delete Schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Total Schedules
          </p>
          <p className="text-violet-400 font-mono text-2xl font-bold">{schedules.length}</p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Active
          </p>
          <p className="text-green-400 font-mono text-2xl font-bold">
            {schedules.filter((s) => s.isEnabled).length}
          </p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Inactive
          </p>
          <p className="text-slate-500 font-mono text-2xl font-bold">
            {schedules.filter((s) => !s.isEnabled).length}
          </p>
        </div>
      </div>

      {/* Schedule Form Modal */}
      {isFormOpen && (
        <ScheduleFormModal
          schedule={selectedSchedule}
          templates={templates}
          tenants={tenants}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedSchedule(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Schedule"
        message={`Are you sure you want to delete schedule "${scheduleToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
