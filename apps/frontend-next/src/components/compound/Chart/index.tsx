'use client';

import { ReactNode, ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

// ==================== Root Component ====================

interface ChartRootProps {
  children: ReactElement;
  title: string;
  subtitle?: string;
  height?: number;
  className?: string;
  headerRight?: ReactNode;
}

function ChartRoot({
  children,
  title,
  subtitle,
  height = 256,
  className = '',
  headerRight,
}: ChartRootProps) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-6 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== Legend ====================

interface LegendItem {
  color: string;
  label: string;
  value?: string | number;
}

interface ChartLegendProps {
  items: LegendItem[];
  position?: 'top' | 'bottom';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

function ChartLegend({
  items,
  position = 'bottom',
  align = 'center',
  className = '',
}: ChartLegendProps) {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  const marginClass = position === 'top' ? 'mb-4' : 'mt-4';

  return (
    <div className={`flex flex-wrap gap-4 ${alignClass} ${marginClass} ${className}`}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-slate-400 text-sm">{item.label}</span>
          {item.value !== undefined && (
            <span className="text-white text-sm font-medium">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== Metric Display ====================

interface ChartMetricProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  className?: string;
}

function ChartMetric({ label, value, trend, className = '' }: ChartMetricProps) {
  return (
    <div className={`${className}`}>
      <div className="text-slate-400 text-sm">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <span
            className={`text-sm font-medium ${
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

// ==================== Loading State ====================

interface ChartLoadingProps {
  height?: number;
}

function ChartLoading({ height = 256 }: ChartLoadingProps) {
  return (
    <div
      className="bg-slate-800 border border-slate-700 rounded-xl p-6 animate-pulse"
      style={{ height: height + 80 }}
    >
      <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
      <div className="h-4 bg-slate-700 rounded w-1/4 mb-4" />
      <div className="h-full bg-slate-700 rounded" style={{ height }} />
    </div>
  );
}

// ==================== No Data State ====================

interface ChartNoDataProps {
  title: string;
  message?: string;
  height?: number;
}

function ChartNoData({
  title,
  message = '표시할 데이터가 없습니다',
  height = 256,
}: ChartNoDataProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div
        className="flex items-center justify-center text-slate-400"
        style={{ height }}
      >
        {message}
      </div>
    </div>
  );
}

// ==================== Wrapper with Title ====================

interface ChartWrapperProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

function ChartWrapper({
  children,
  title,
  subtitle,
  className = '',
}: ChartWrapperProps) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && (
          <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ==================== Export Compound Component ====================

export const Chart = Object.assign(ChartRoot, {
  Legend: ChartLegend,
  Metric: ChartMetric,
  Loading: ChartLoading,
  NoData: ChartNoData,
  Wrapper: ChartWrapper,
});

// Export types
export type {
  ChartRootProps,
  LegendItem,
  ChartLegendProps,
  ChartMetricProps,
  ChartLoadingProps,
  ChartNoDataProps,
  ChartWrapperProps,
};

// Chart color palette (matching existing theme)
export const CHART_COLORS = {
  primary: '#3b82f6',    // blue-500
  secondary: '#8b5cf6',  // violet-500
  success: '#10b981',    // emerald-500
  warning: '#f59e0b',    // amber-500
  danger: '#ef4444',     // red-500
  info: '#06b6d4',       // cyan-500
  // Extended palette
  palette: [
    '#3b82f6',
    '#8b5cf6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#ec4899',
    '#14b8a6',
  ],
} as const;
