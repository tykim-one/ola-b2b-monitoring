'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  batchAnalysisApi,
  BatchSchedulerConfig,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  AnalysisPromptTemplate,
  TenantInfo,
} from '@/services/batchAnalysisService';

interface ScheduleFormModalProps {
  schedule: BatchSchedulerConfig | null;
  templates: AnalysisPromptTemplate[];
  tenants: TenantInfo[];
  onClose: () => void;
  onSuccess: (schedule: BatchSchedulerConfig) => void;
}

interface DaySelection {
  [key: number]: boolean;
}

export default function ScheduleFormModal({
  schedule,
  templates,
  tenants,
  onClose,
  onSuccess,
}: ScheduleFormModalProps) {
  const [name, setName] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(10);
  const [daysSelection, setDaysSelection] = useState<DaySelection>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: false,
    0: false,
  });
  const [targetTenantId, setTargetTenantId] = useState<string>('');
  const [sampleSize, setSampleSize] = useState(100);
  const [promptTemplateId, setPromptTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schedule) {
      // Edit mode
      setName(schedule.name);
      setIsEnabled(schedule.isEnabled);
      setHour(schedule.hour);
      setMinute(schedule.minute);

      // Parse daysOfWeek
      const days = schedule.daysOfWeek.split(',').map((d) => parseInt(d.trim()));
      const selection: DaySelection = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };
      days.forEach((day) => {
        selection[day] = true;
      });
      setDaysSelection(selection);

      setTargetTenantId(schedule.targetTenantId || '');
      setSampleSize(schedule.sampleSize);
      setPromptTemplateId(schedule.promptTemplateId || '');
    }
  }, [schedule]);

  const handleDayToggle = (day: number) => {
    setDaysSelection((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const getDaysOfWeekString = (): string => {
    const selectedDays = Object.entries(daysSelection)
      .filter(([_, isSelected]) => isSelected)
      .map(([day, _]) => parseInt(day))
      .sort();

    return selectedDays.join(',');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const daysOfWeek = getDaysOfWeekString();
    if (!daysOfWeek) {
      setError('요일을 최소 1개 이상 선택해주세요.');
      return;
    }

    try {
      setLoading(true);

      if (schedule) {
        // Update
        const data: UpdateScheduleRequest = {
          name,
          isEnabled,
          hour,
          minute,
          daysOfWeek,
          targetTenantId: targetTenantId || null,
          sampleSize,
          promptTemplateId: promptTemplateId || null,
        };
        const updated = await batchAnalysisApi.updateSchedule(schedule.id, data);
        onSuccess(updated);
      } else {
        // Create
        const data: CreateScheduleRequest = {
          name,
          isEnabled,
          hour,
          minute,
          daysOfWeek,
          targetTenantId: targetTenantId || undefined,
          sampleSize,
          promptTemplateId: promptTemplateId || undefined,
        };
        const created = await batchAnalysisApi.createSchedule(data);
        onSuccess(created);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const dayLabels: Record<number, string> = {
    1: '월',
    2: '화',
    3: '수',
    4: '목',
    5: '금',
    6: '토',
    0: '일',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-slate-900 border-2 border-violet-500/50 shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900">
          <h3 className="font-mono text-xl font-bold text-violet-400 uppercase tracking-wider">
            {schedule ? '스케줄 수정' : '새 스케줄 추가'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="p-4 border-2 border-red-500/50 bg-red-950/30">
              <p className="text-red-400 font-mono text-sm">{error}</p>
            </div>
          )}

          {/* Schedule Name */}
          <div>
            <label className="block text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
              스케줄 이름 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 오전 분석, 야간 분석"
              className="
                w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                text-slate-100 placeholder-slate-500
                focus:outline-none focus:border-violet-500 transition-colors
                font-mono text-sm
              "
              required
              disabled={loading}
            />
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
                  disabled={loading}
                />
                <div
                  className={`
                    w-11 h-6 rounded-full transition-colors
                    ${isEnabled ? 'bg-green-600' : 'bg-slate-700'}
                  `}
                >
                  <div
                    className={`
                      absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform
                      ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
                활성화
              </span>
            </label>
          </div>

          {/* Execution Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                시 (Hour) <span className="text-red-400">*</span>
              </label>
              <select
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value))}
                className="
                  w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                  text-slate-100 focus:outline-none focus:border-violet-500 transition-colors
                  font-mono text-sm
                "
                required
                disabled={loading}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                분 (Minute) <span className="text-red-400">*</span>
              </label>
              <select
                value={minute}
                onChange={(e) => setMinute(parseInt(e.target.value))}
                className="
                  w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                  text-slate-100 focus:outline-none focus:border-violet-500 transition-colors
                  font-mono text-sm
                "
                required
                disabled={loading}
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <label className="block text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
              요일 선택 <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`
                    px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider
                    border-2 transition-all
                    ${
                      daysSelection[day]
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }
                  `}
                  disabled={loading}
                >
                  {dayLabels[day]}
                </button>
              ))}
            </div>
          </div>

          {/* Target Tenant */}
          <div>
            <label className="block text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
              대상 Tenant
            </label>
            <select
              value={targetTenantId}
              onChange={(e) => setTargetTenantId(e.target.value)}
              className="
                w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                text-slate-100 focus:outline-none focus:border-violet-500 transition-colors
                font-mono text-sm
              "
              disabled={loading}
            >
              <option value="">전체 Tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.tenant_id} value={tenant.tenant_id}>
                  {tenant.tenant_id} ({tenant.chat_count} chats)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              비어있으면 전체 테넌트 대상으로 분석
            </p>
          </div>

          {/* Sample Size */}
          <div>
            <label className="block text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
              샘플 수 <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(parseInt(e.target.value))}
              min={10}
              max={500}
              className="
                w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                text-slate-100 placeholder-slate-500
                focus:outline-none focus:border-violet-500 transition-colors
                font-mono text-sm
              "
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs text-slate-500 font-mono">10-500 사이의 값</p>
          </div>

          {/* Prompt Template */}
          <div>
            <label className="block text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
              분석 프롬프트
            </label>
            <select
              value={promptTemplateId}
              onChange={(e) => setPromptTemplateId(e.target.value)}
              className="
                w-full px-4 py-2.5 bg-slate-950 border border-slate-700
                text-slate-100 focus:outline-none focus:border-violet-500 transition-colors
                font-mono text-sm
              "
              disabled={loading}
            >
              <option value="">기본 템플릿</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.isDefault && ' (기본)'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              비어있으면 기본 템플릿 사용
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                px-6 py-2.5 font-mono font-semibold uppercase tracking-wider text-sm
                bg-slate-800 hover:bg-slate-700 border border-slate-600
                text-slate-300 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="
                px-6 py-2.5 font-mono font-semibold uppercase tracking-wider text-sm
                bg-violet-600 hover:bg-violet-700 border border-violet-500
                text-white transition-all shadow-lg shadow-violet-500/20
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {loading ? 'Saving...' : schedule ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
