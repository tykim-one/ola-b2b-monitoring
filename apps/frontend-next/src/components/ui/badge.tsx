import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';

  const variantClasses = {
    default: 'bg-blue-600 text-white',
    outline: 'border border-slate-600 text-slate-300',
    secondary: 'bg-slate-700 text-slate-300',
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
