'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type PresetType = 'day' | 'week' | 'month' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  days: number;      // Number of days for API calls
}

interface DateRangeFilterProps {
  defaultPreset?: PresetType;
  onChange: (range: DateRange) => void;
  className?: string;
}

// 날짜를 YYYY-MM-DD 형식으로 변환
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// 프리셋에 따른 날짜 범위 계산
const calculateDateRange = (preset: PresetType, customStart?: string, customEnd?: string): DateRange => {
  const today = new Date();
  const endDate = formatDate(today);

  switch (preset) {
    case 'day':
      return { startDate: endDate, endDate, days: 1 };
    case 'week':
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return { startDate: formatDate(weekAgo), endDate, days: 7 };
    case 'month':
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      return { startDate: formatDate(monthAgo), endDate, days: 30 };
    case 'custom':
      if (customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return { startDate: customStart, endDate: customEnd, days: diffDays };
      }
      // 기본값은 주
      const defaultWeekAgo = new Date(today);
      defaultWeekAgo.setDate(today.getDate() - 7);
      return { startDate: formatDate(defaultWeekAgo), endDate, days: 7 };
    default:
      const defaultStart = new Date(today);
      defaultStart.setDate(today.getDate() - 7);
      return { startDate: formatDate(defaultStart), endDate, days: 7 };
  }
};

export default function DateRangeFilter({
  defaultPreset = 'week',
  onChange,
  className = '',
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetType>(defaultPreset);
  const [showCustom, setShowCustom] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 초기 로드 여부 추적 (StrictMode 중복 호출 방지)
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 초기 로드 시 기본 프리셋 적용 (한 번만 실행)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const range = calculateDateRange(defaultPreset);
      onChangeRef.current(range);
    }
  }, [defaultPreset]);

  // 프리셋 버튼 클릭 핸들러
  const handlePresetClick = useCallback((preset: PresetType) => {
    setActivePreset(preset);
    if (preset !== 'custom') {
      setShowCustom(false);
      const range = calculateDateRange(preset);
      onChangeRef.current(range);
    } else {
      setShowCustom(true);
    }
  }, []);

  // 커스텀 날짜 적용
  const handleApplyCustom = useCallback(() => {
    if (customStartDate && customEndDate) {
      const range = calculateDateRange('custom', customStartDate, customEndDate);
      onChangeRef.current(range);
    }
  }, [customStartDate, customEndDate]);

  // 커스텀 날짜 변경 핸들러
  const handleCustomStartChange = useCallback((value: string) => {
    setCustomStartDate(value);
    if (value && customEndDate) {
      const range = calculateDateRange('custom', value, customEndDate);
      onChangeRef.current(range);
    }
  }, [customEndDate]);

  const handleCustomEndChange = useCallback((value: string) => {
    setCustomEndDate(value);
    if (customStartDate && value) {
      const range = calculateDateRange('custom', customStartDate, value);
      onChangeRef.current(range);
    }
  }, [customStartDate]);

  const presets: { key: PresetType; label: string }[] = [
    { key: 'day', label: '1일' },
    { key: 'week', label: '7일' },
    { key: 'month', label: '30일' },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* 프리셋 버튼 그룹 */}
      <div className="flex rounded-lg overflow-hidden border border-slate-700">
        {presets.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetClick(preset.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activePreset === preset.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* 커스텀 날짜 토글 버튼 */}
      <button
        onClick={() => {
          setShowCustom(!showCustom);
          if (!showCustom) {
            setActivePreset('custom');
          }
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
          activePreset === 'custom'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
        }`}
      >
        <Calendar className="w-4 h-4" />
        기간 선택
        <ChevronDown className={`w-4 h-4 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
      </button>

      {/* 커스텀 날짜 입력 */}
      {showCustom && (
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-2">
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => handleCustomStartChange(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <span className="text-slate-400">~</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => handleCustomEndChange(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      )}
    </div>
  );
}
