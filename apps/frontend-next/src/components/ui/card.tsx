import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-slate-800 border border-slate-700 rounded-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
