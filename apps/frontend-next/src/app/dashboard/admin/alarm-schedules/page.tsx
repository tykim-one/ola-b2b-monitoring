'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Bell, Settings, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AlarmSchedule } from '@/services/alarmScheduleService';
import {
  useAlarmSchedules,
  useToggleAlarmSchedule,
} from '@/hooks/queries/use-alarm-schedules';
import { DataTable, Column } from '@/components/compound/DataTable';
import { StatsFooter } from '@/components/ui/StatsFooter';
import ScheduleEditModal from './components/ScheduleEditModal';

/** 모듈별 한글 이름 매핑 */
const MODULE_LABELS: Record<string, string> = {
  'job-monitoring': 'Job 실패 알림',
  'report-monitoring': '리포트 데이터 품질',
  'ui-check': 'UI 렌더링 체크',
};

/** 모듈별 설명 */
const MODULE_DESCRIPTIONS: Record<string, string> = {
  'job-monitoring': 'ETL Job 실패 감지 시 Slack 알림',
  'report-monitoring': '리포트 데이터 누락/불완전/의심/노후 체크',
  'ui-check': 'Playwright 기반 UI 렌더링 이슈 감지',
};

/** Cron 표현식을 사람이 읽기 쉽게 변환 */
function describeCron(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour] = parts;

  if (min.startsWith('*/') && hour === '*') {
    return `${min.replace('*/', '')}분마다`;
  }
  if (min.startsWith('*/') === false && hour !== '*' && !hour.includes('/') && !hour.includes(',')) {
    return `매일 ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  if (hour.startsWith('*/')) {
    return `${hour.replace('*/', '')}시간마다`;
  }
  return cron;
}

export default function AlarmSchedulesPage() {
  const router = useRouter();
  const { data: schedules = [], isLoading, error } = useAlarmSchedules();
  const toggleMutation = useToggleAlarmSchedule();

  const [editingSchedule, setEditingSchedule] = useState<AlarmSchedule | null>(null);

  const handleToggle = (schedule: AlarmSchedule) => {
    toggleMutation.mutate(schedule.id, {
      onError: (err: Error) => {
        alert(err.message || '토글에 실패했습니다.');
      },
    });
  };

  const handleEdit = (schedule: AlarmSchedule) => {
    setEditingSchedule(schedule);
  };

  const handleEditSuccess = () => {
    setEditingSchedule(null);
  };

  const columns: Column<AlarmSchedule>[] = useMemo(() => [
    {
      key: 'isEnabled',
      header: '상태',
      render: (_value, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggle(row); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            row.isEnabled ? 'bg-green-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              row.isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      ),
    },
    {
      key: 'name',
      header: '알림 이름',
      render: (_value, row) => (
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-500" />
            <span className="text-gray-800 font-medium">
              {MODULE_LABELS[row.module] || row.name}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-6">
            {MODULE_DESCRIPTIONS[row.module] || row.description || ''}
          </p>
        </div>
      ),
    },
    {
      key: 'cronExpression',
      header: '실행 주기',
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-500" />
          <div>
            <span className="text-gray-700 text-sm font-medium">
              {describeCron(row.cronExpression)}
            </span>
            <span className="text-xs text-gray-400 ml-2 font-mono">
              ({row.cronExpression})
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'nextExecution',
      header: '다음 실행',
      render: (_value, row) => (
        <span className="text-gray-500 text-sm">
          {row.nextExecution
            ? new Date(row.nextExecution).toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '-'}
        </span>
      ),
    },
    {
      key: 'isRunning',
      header: '실행 상태',
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              row.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
          <span className={`text-xs ${row.isRunning ? 'text-green-600' : 'text-gray-400'}`}>
            {row.isRunning ? '실행 중' : '중지'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '설정',
      align: 'right' as const,
      render: (_value, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
          className="p-2 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 text-gray-500 hover:text-blue-600 transition-all rounded"
          title="스케줄 수정"
        >
          <Settings className="w-4 h-4" />
        </button>
      ),
    },
  ], []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">스케줄 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              알림 스케줄 관리
            </h1>
            <p className="text-gray-500 text-sm">
              각 알림 모듈의 실행 주기를 설정합니다. 변경 사항은 즉시 반영됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-red-500 text-sm">ERROR: {(error as Error).message}</p>
        </div>
      )}

      {/* Alarm Schedules Table */}
      <DataTable data={schedules} columns={columns} variant="flat" rowKey="id">
        <DataTable.Content>
          <DataTable.Header />
          <DataTable.Body
            emptyMessage="등록된 알림 스케줄이 없습니다"
            emptyIcon={<Bell className="w-12 h-12 text-gray-300" />}
          />
        </DataTable.Content>
      </DataTable>

      {/* Stats Footer */}
      <StatsFooter
        className="mt-6"
        items={[
          { label: '전체 스케줄', value: schedules.length, color: 'text-blue-500' },
          { label: '활성', value: schedules.filter((s) => s.isEnabled).length, color: 'text-green-500' },
          { label: '비활성', value: schedules.filter((s) => !s.isEnabled).length, color: 'text-gray-400' },
        ]}
      />

      {/* Batch Analysis Link */}
      <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">배치 분석 스케줄</h3>
            <p className="text-xs text-gray-400 mt-1">
              배치 분석 스케줄은 별도 페이지에서 관리합니다.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/admin/batch-analysis/schedules')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 border border-blue-200 rounded transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            배치 분석 스케줄 관리
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSchedule && (
        <ScheduleEditModal
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
