import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-700/50 rounded ${className}`}
      {...props}
    />
  );
}
