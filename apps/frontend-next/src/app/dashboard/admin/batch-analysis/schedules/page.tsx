'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Clock, Calendar, ArrowLeft } from 'lucide-react';
import {
  BatchSchedulerConfig,
} from '@/services/batchAnalysisService';
import {
  useSchedules,
  useScheduleTemplates,
  useScheduleTenants,
  useDeleteSchedule,
  useToggleSchedule,
} from '@/hooks/queries';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ScheduleFormModal from './components/ScheduleFormModal';
import { StatsFooter } from '@/components/ui/StatsFooter';
import { DataTable, Column } from '@/components/compound/DataTable';

export default function SchedulesPage() {
  const router = useRouter();
  const { data: schedules = [], isLoading, error } = useSchedules();
  const { data: templates = [] } = useScheduleTemplates();
  const { data: tenants = [] } = useScheduleTenants(30);
  const deleteSchedule = useDeleteSchedule();
  const toggleSchedule = useToggleSchedule();

  const [selectedSchedule, setSelectedSchedule] = useState<BatchSchedulerConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<BatchSchedulerConfig | null>(null);

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

  const handleDeleteConfirm = () => {
    if (!scheduleToDelete) return;
    deleteSchedule.mutate(scheduleToDelete.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setScheduleToDelete(null);
      },
      onError: (err: Error) => {
        alert(err.message || 'Failed to delete schedule');
      },
    });
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedSchedule(null);
  };

  const handleToggleEnabled = (schedule: BatchSchedulerConfig) => {
    toggleSchedule.mutate(schedule.id, {
      onError: (err: Error) => {
        alert(err.message || 'Failed to toggle schedule');
      },
    });
  };

  const formatDaysOfWeek = (daysOfWeek: string): string => {
    const days = daysOfWeek.split(',').map((d) => parseInt(d.trim())).sort();

    if (days.length === 5 && days.join(',') === '1,2,3,4,5') {
      return '\uD3C9\uC77C';
    }

    if (days.length === 7) {
      return '\uB9E4\uC77C';
    }

    const dayNames: Record<number, string> = {
      0: '\uC77C',
      1: '\uC6D4',
      2: '\uD654',
      3: '\uC218',
      4: '\uBAA9',
      5: '\uAE08',
      6: '\uD1A0',
    };

    return days.map((d) => dayNames[d]).join(', ');
  };

  const formatTime = (hour: number, minute: number, daysOfWeek: string): string => {
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const daysStr = formatDaysOfWeek(daysOfWeek);
    return `${timeStr} (${daysStr})`;
  };

  const scheduleColumns: Column<BatchSchedulerConfig>[] = useMemo(() => [
    {
      key: 'isEnabled',
      header: '\uC0C1\uD0DC',
      render: (_value, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleEnabled(row); }}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${row.isEnabled ? 'bg-green-600' : 'bg-gray-100'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${row.isEnabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      ),
    },
    {
      key: 'name',
      header: '\uC774\uB984',
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-400" />
          <span className="text-gray-800 font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'hour',
      header: '\uC2E4\uD589 \uC2DC\uAC04',
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-gray-600 text-sm">
            {formatTime(row.hour, row.minute, row.daysOfWeek)}
          </span>
        </div>
      ),
    },
    {
      key: 'targetTenantId',
      header: '\uB300\uC0C1 Tenant',
      render: (_value, row) => (
        <span className="text-gray-600 text-sm">
          {row.targetTenantId || '\uC804\uCCB4'}
        </span>
      ),
    },
    {
      key: 'sampleSize',
      header: '\uC0D8\uD50C \uC218',
      render: (_value, row) => (
        <span className="text-gray-600 text-sm">
          {row.sampleSize}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '\uC561\uC158',
      align: 'right' as const,
      render: (_value, row) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEditSchedule(row); }}
            className="p-2 bg-white hover:bg-violet-600/20 border border-gray-200 hover:border-violet-500/50 text-gray-500 hover:text-violet-400 transition-all"
            title="Edit Schedule"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}
            className="p-2 bg-white hover:bg-red-600/20 border border-gray-200 hover:border-red-500/50 text-gray-500 hover:text-red-400 transition-all"
            title="Delete Schedule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [handleToggleEnabled, handleEditSchedule, handleDeleteClick, formatTime]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            Loading System Data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/admin/batch-analysis')}
              className="
                p-2 bg-white hover:bg-gray-100 border border-gray-200
                text-gray-500 hover:text-gray-700 transition-all
              "
              title="Back to Batch Analysis"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                배치 분석 스케줄 관리
              </h1>
              <p className="text-gray-500 text-sm">
                {schedules.length}개의 스케줄이 설정되어 있습니다
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateSchedule}
            className="
              flex items-center gap-2 px-6 py-3
              bg-violet-600 hover:bg-violet-700 border-2 border-violet-500
              text-white font-medium text-sm
              transition-all shadow-sm
            "
          >
            <Plus className="w-5 h-5" />
            새 스케줄 추가
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50">
          <p className="text-red-400 text-sm">ERROR: {(error as Error).message}</p>
        </div>
      )}

      {/* Schedules Table */}
      <DataTable data={schedules} columns={scheduleColumns} variant="flat" rowKey="id">
        <DataTable.Content>
          <DataTable.Header />
          <DataTable.Body
            emptyMessage="NO SCHEDULES CONFIGURED"
            emptyIcon={<Clock className="w-12 h-12 text-gray-300" />}
          />
        </DataTable.Content>
      </DataTable>

      {/* Stats Footer */}
      <StatsFooter
        className="mt-6"
        items={[
          { label: 'Total Schedules', value: schedules.length, color: 'text-violet-400' },
          { label: 'Active', value: schedules.filter((s) => s.isEnabled).length, color: 'text-green-400' },
          { label: 'Inactive', value: schedules.filter((s) => !s.isEnabled).length, color: 'text-gray-400' },
        ]}
      />

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
        isLoading={deleteSchedule.isPending}
      />
    </div>
  );
}
