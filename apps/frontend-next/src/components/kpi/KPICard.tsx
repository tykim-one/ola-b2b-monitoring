'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  status?: 'success' | 'warning' | 'error' | 'neutral';
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'currency' | 'tokens';
  size?: 'default' | 'compact';
  iconPosition?: 'right' | 'left';
}

const formatValue = (value: string | number, format?: string): string => {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'number':
      return value.toLocaleString();
    case 'percentage':
      return `${value.toFixed(2)}%`;
    case 'currency':
      return `$${value.toFixed(2)}`;
    case 'tokens':
      if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toLocaleString();
    default:
      return value.toLocaleString();
  }
};

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'success':
      return 'text-emerald-400';
    case 'warning':
      return 'text-yellow-400';
    case 'error':
      return 'text-rose-500';
    default:
      return 'text-gray-900';
  }
};

const getTrendIcon = (value: number) => {
  if (value > 0) return <TrendingUp className="w-3 h-3" />;
  if (value < 0) return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
};

const getTrendColor = (value: number, isInverse?: boolean) => {
  const positive = isInverse ? value < 0 : value > 0;
  if (positive) return 'text-emerald-400';
  if (value === 0) return 'text-gray-500';
  return 'text-rose-400';
};

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  status,
  icon,
  format,
  size = 'default',
  iconPosition = 'right',
}) => {
  const sizeConfig = {
    default: { padding: 'p-5', valueSize: 'text-3xl', titleSize: 'text-sm' },
    compact: { padding: 'p-3', valueSize: 'text-xl', titleSize: 'text-xs' },
  };
  const cfg = sizeConfig[size];

  return (
    <div className={`bg-white border border-gray-200 ${cfg.padding} rounded-2xl shadow-sm hover:border-gray-300 transition-colors`}>
      <div className="flex items-center justify-between mb-1">
        {iconPosition === 'left' && icon && <div className="text-gray-400">{icon}</div>}
        <div className={`text-gray-500 ${cfg.titleSize} font-medium`}>{title}</div>
        {iconPosition === 'right' && icon && <div className="text-gray-400">{icon}</div>}
      </div>

      <div className={`${cfg.valueSize} font-bold ${getStatusColor(status)}`}>
        {formatValue(value, format)}
      </div>

      {(trend || subtitle) && (
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(trend.value)}`}>
              {getTrendIcon(trend.value)}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-400">{trend.label}</span>
            </div>
          )}
          {subtitle && !trend && (
            <div className="text-gray-400 text-xs">{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default KPICard;
