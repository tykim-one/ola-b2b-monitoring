'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AlarmSchedule, UpdateAlarmScheduleRequest } from '@/services/alarmScheduleService';
import { useUpdateAlarmSchedule } from '@/hooks/queries/use-alarm-schedules';

interface ScheduleEditModalProps {
  schedule: AlarmSchedule;
  onClose: () => void;
  onSuccess: () => void;
}

/** 모듈별 한글 이름 매핑 */
const MODULE_LABELS: Record<string, string> = {
  'job-monitoring': 'Job 실패 알림',
  'report-monitoring': '리포트 데이터 품질 체크',
  'ui-check': 'UI 렌더링 체크',
};

/** Cron 프리셋 목록 */
const CRON_PRESETS = [
  { label: '1분마다', value: '*/1 * * * *' },
  { label: '5분마다', value: '*/5 * * * *' },
  { label: '10분마다', value: '*/10 * * * *' },
  { label: '30분마다', value: '*/30 * * * *' },
  { label: '1시간마다', value: '0 * * * *' },
  { label: '매일 08:00', value: '0 8 * * *' },
  { label: '매일 08:30', value: '30 8 * * *' },
  { label: '매일 09:00', value: '0 9 * * *' },
  { label: '매일 18:00', value: '0 18 * * *' },
  { label: '매일 자정', value: '0 0 * * *' },
];

export default function ScheduleEditModal({
  schedule,
  onClose,
  onSuccess,
}: ScheduleEditModalProps) {
  const [cronExpression, setCronExpression] = useState(schedule.cronExpression);
  const [timezone, setTimezone] = useState(schedule.timezone);
  const [isEnabled, setIsEnabled] = useState(schedule.isEnabled);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useUpdateAlarmSchedule();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cronExpression.trim()) {
      setError('Cron 표현식을 입력해주세요.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: schedule.id,
        data: { cronExpression, timezone, isEnabled },
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '저장에 실패했습니다.');
    }
  };

  const handlePresetClick = (value: string) => {
    setCronExpression(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white border-2 border-blue-500/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h3 className="text-xl font-bold text-gray-900">
            스케줄 수정
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
            disabled={updateMutation.isPending}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {/* Module Info (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">모듈</label>
            <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-600 text-sm rounded">
              {MODULE_LABELS[schedule.module] || schedule.module}
              <span className="ml-2 text-xs text-gray-400">({schedule.module})</span>
            </div>
          </div>

          {/* Enabled Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only"
                  disabled={updateMutation.isPending}
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${
                    isEnabled ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-600">활성화</span>
            </label>
          </div>

          {/* Cron Expression */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Cron 표현식 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="*/10 * * * *"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors text-sm font-mono rounded"
              required
              disabled={updateMutation.isPending}
            />
            <p className="mt-1 text-xs text-gray-400">
              형식: 분 시 일 월 요일 (예: */10 * * * * = 10분마다)
            </p>
          </div>

          {/* Cron Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">빠른 선택</label>
            <div className="flex flex-wrap gap-2">
              {CRON_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetClick(preset.value)}
                  className={`px-3 py-1.5 text-xs font-medium border rounded transition-all ${
                    cronExpression === preset.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                  disabled={updateMutation.isPending}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">타임존</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:border-blue-500 transition-colors text-sm rounded"
              disabled={updateMutation.isPending}
            >
              <option value="Asia/Seoul">Asia/Seoul (KST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 text-sm font-medium bg-white hover:bg-gray-100 border border-gray-300 text-gray-600 transition-all rounded disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white transition-all shadow-lg shadow-blue-500/20 rounded disabled:opacity-50"
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
