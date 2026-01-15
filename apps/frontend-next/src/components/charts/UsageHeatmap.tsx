'use client';

import React from 'react';

interface HeatmapData {
  day_of_week: number;
  hour: number;
  request_count: number;
  avg_tokens: number;
}

interface UsageHeatmapProps {
  data: HeatmapData[];
  title?: string;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getIntensityColor = (value: number, max: number): string => {
  if (max === 0) return 'bg-slate-800';
  const intensity = value / max;

  if (intensity === 0) return 'bg-slate-800';
  if (intensity < 0.2) return 'bg-blue-900/30';
  if (intensity < 0.4) return 'bg-blue-800/50';
  if (intensity < 0.6) return 'bg-blue-600/60';
  if (intensity < 0.8) return 'bg-blue-500/70';
  return 'bg-blue-400/80';
};

const UsageHeatmap: React.FC<UsageHeatmapProps> = ({
  data,
  title = '시간대별 사용량 히트맵',
}) => {
  // 데이터를 2D 맵으로 변환
  const heatmapMatrix: Record<string, HeatmapData> = {};
  data.forEach((item) => {
    const key = `${item.day_of_week}-${item.hour}`;
    heatmapMatrix[key] = item;
  });

  const maxRequests = Math.max(...data.map((d) => d.request_count), 1);

  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hours header */}
          <div className="flex mb-1">
            <div className="w-8 shrink-0" /> {/* Day label space */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-slate-500 text-[10px]"
              >
                {hour % 3 === 0 ? `${hour}` : ''}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-8 shrink-0 text-slate-400 text-xs pr-2 text-right">
                {day}
              </div>
              <div className="flex flex-1 gap-[2px]">
                {HOURS.map((hour) => {
                  const key = `${dayIndex + 1}-${hour}`;
                  const cellData = heatmapMatrix[key];
                  const value = cellData?.request_count || 0;

                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-6 rounded-sm ${getIntensityColor(value, maxRequests)}
                        cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all`}
                      title={`${day}요일 ${hour}시: ${value.toLocaleString()}건`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-slate-500 text-xs">적음</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded-sm bg-slate-800" />
          <div className="w-4 h-4 rounded-sm bg-blue-900/30" />
          <div className="w-4 h-4 rounded-sm bg-blue-800/50" />
          <div className="w-4 h-4 rounded-sm bg-blue-600/60" />
          <div className="w-4 h-4 rounded-sm bg-blue-500/70" />
          <div className="w-4 h-4 rounded-sm bg-blue-400/80" />
        </div>
        <span className="text-slate-500 text-xs">많음</span>
      </div>
    </div>
  );
};

export default UsageHeatmap;
