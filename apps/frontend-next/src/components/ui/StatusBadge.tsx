import React from 'react';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'purple';

export interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
  shape?: 'pill' | 'rect';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-300',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

const shapeStyles = {
  pill: 'rounded-full',
  rect: 'rounded',
};

const sizeStyles = {
  sm: 'px-2 py-0.5',
  md: 'px-2.5 py-1',
};

export function StatusBadge({
  label,
  variant,
  shape = 'rect',
  size = 'sm',
  icon,
  className = '',
}: StatusBadgeProps) {
  const classes = [
    'inline-flex items-center font-medium border text-xs',
    variantStyles[variant],
    shapeStyles[shape],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes}>{icon && <span className="mr-1 inline-flex">{icon}</span>}{label}</span>;
}
