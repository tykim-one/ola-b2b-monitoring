'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import * as LucideIcons from 'lucide-react';
import type { ServiceConfig, ServiceHealthData } from '@ola/shared-types';

interface ServiceCardProps {
  config: ServiceConfig;
  healthData?: ServiceHealthData;
  loading?: boolean;
  onClick?: () => void;
}

export function ServiceCard({ config, healthData, loading, onClick }: ServiceCardProps) {
  const Icon = (LucideIcons as any)[config.icon] || LucideIcons.HelpCircle;

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const statusConfig = {
    healthy: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    error: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  };

  const statusLabel = {
    healthy: '정상',
    warning: '주의',
    error: '오류',
  };

  const currentStatus = healthData?.status || 'healthy';
  const statusStyle = statusConfig[currentStatus];

  return (
    <div
      className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Icon className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
        </div>
        {healthData && (
          <Badge
            variant="outline"
            className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}
          >
            {statusLabel[healthData.status]}
          </Badge>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {config.card.kpis.map((kpi) => {
          const value = healthData?.kpis[kpi.key];
          const formattedValue = formatKPIValue(value, kpi.format);
          const status = getKPIStatus(value, kpi.thresholds);

          return (
            <div key={kpi.key} className="text-center">
              <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
              <p
                className={`text-lg font-semibold ${
                  status === 'error'
                    ? 'text-rose-500'
                    : status === 'warning'
                    ? 'text-amber-500'
                    : 'text-gray-900'
                }`}
              >
                {formattedValue ?? '-'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mini Chart */}
      <div className="h-24 bg-gray-50 rounded-xl p-3 border border-gray-100">
        <p className="text-xs text-gray-500 mb-2">{config.card.chart.label}</p>
        {healthData?.chartData ? (
          <MiniChart data={healthData.chartData} type={config.card.chart.type} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            데이터 없음
          </div>
        )}
      </div>
    </div>
  );
}

function formatKPIValue(
  value: number | string | undefined,
  format: 'number' | 'percentage' | 'duration' | 'currency'
): string | undefined {
  if (value === undefined || value === null) return undefined;

  switch (format) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'percentage':
      return typeof value === 'number' ? `${value.toFixed(1)}` : `${value}`;
    case 'duration':
      return typeof value === 'number' ? `${value}ms` : String(value);
    case 'currency':
      return typeof value === 'number' ? `$${value.toFixed(2)}` : String(value);
    default:
      return String(value);
  }
}

function getKPIStatus(
  value: number | string | undefined,
  thresholds?: { warning?: number; error?: number }
): 'healthy' | 'warning' | 'error' {
  if (!thresholds || typeof value !== 'number') return 'healthy';

  if (thresholds.error !== undefined && value < thresholds.error) {
    return 'error';
  }
  if (thresholds.warning !== undefined && value < thresholds.warning) {
    return 'warning';
  }
  return 'healthy';
}

interface MiniChartProps {
  data: Array<{ timestamp: string; value: number }>;
  type: 'line' | 'bar' | 'progress' | 'status-list';
}

function MiniChart({ data, type }: MiniChartProps) {
  if (type === 'progress') {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const max = 100;
    const percentage = Math.min((total / max) * 100, 100);

    return (
      <div className="flex items-center gap-2 h-full">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-900 font-semibold">{percentage.toFixed(0)}%</span>
      </div>
    );
  }

  if (type === 'status-list') {
    return (
      <div className="space-y-1">
        {data.slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {new Date(item.timestamp).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span
              className={`font-semibold ${
                item.value > 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {item.value > 0 ? '성공' : '실패'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Simple line chart (SVG)
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const height = 100;
  const padding = 5;

  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.value / maxValue) * (height - padding * 2));
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((d.value / maxValue) * (height - padding * 2));
        return <circle key={i} cx={x} cy={y} r="2" fill="#3b82f6" />;
      })}
    </svg>
  );
}
