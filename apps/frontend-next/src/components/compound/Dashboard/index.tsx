'use client';

import { createContext, useContext, ReactNode } from 'react';

// ==================== Context ====================

interface DashboardContextValue {
  isLoading: boolean;
  error: Error | null;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('Dashboard components must be used within Dashboard');
  }
  return context;
}

// ==================== Root Component ====================

interface DashboardRootProps {
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

function DashboardRoot({
  children,
  isLoading = false,
  error = null,
  className = '',
}: DashboardRootProps) {
  return (
    <DashboardContext.Provider value={{ isLoading, error }}>
      <div className={`p-8 h-full overflow-y-auto bg-slate-900 ${className}`}>
        {children}
      </div>
    </DashboardContext.Provider>
  );
}

// ==================== Header Component ====================

interface DashboardHeaderProps {
  title: string;
  description?: string;
  rightContent?: ReactNode;
}

function DashboardHeader({ title, description, rightContent }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-3xl font-bold text-white">{title}</h2>
        {description && (
          <p className="text-slate-400 mt-1">{description}</p>
        )}
      </div>
      {rightContent && <div>{rightContent}</div>}
    </div>
  );
}

// ==================== KPI Section ====================

interface DashboardKPISectionProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

function DashboardKPISection({
  children,
  columns = 4,
  className = '',
}: DashboardKPISectionProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
  };

  return (
    <div
      className={`grid grid-cols-1 ${gridCols[columns]} gap-6 mb-8 ${className}`}
    >
      {children}
    </div>
  );
}

// ==================== Charts Section ====================

interface DashboardChartsSectionProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

function DashboardChartsSection({
  children,
  columns = 2,
  className = '',
}: DashboardChartsSectionProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-3',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-8 mb-8 ${className}`}>
      {children}
    </div>
  );
}

// ==================== Table Section ====================

interface DashboardTableSectionProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

function DashboardTableSection({
  children,
  title,
  className = '',
}: DashboardTableSectionProps) {
  return (
    <div className={`bg-slate-800 border border-slate-700 p-6 rounded-xl ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}

// ==================== Loading Skeleton ====================

function DashboardSkeleton() {
  const { isLoading } = useDashboardContext();

  if (!isLoading) return null;

  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="h-10 bg-slate-700 rounded w-1/4 mb-6" />

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-800 rounded-xl" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-80 bg-slate-800 rounded-xl" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="h-96 bg-slate-800 rounded-xl" />
    </div>
  );
}

// ==================== Error Display ====================

interface DashboardErrorProps {
  message?: string;
}

function DashboardError({ message }: DashboardErrorProps) {
  const { error } = useDashboardContext();

  if (!error) return null;

  return (
    <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400 mb-6">
      <div className="font-semibold mb-1">오류가 발생했습니다</div>
      <div className="text-sm">
        {message || error.message || '데이터를 불러오는 중 문제가 발생했습니다.'}
      </div>
    </div>
  );
}

// ==================== Empty State ====================

interface DashboardEmptyProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
}

function DashboardEmpty({
  title = '데이터 없음',
  description = '표시할 데이터가 없습니다.',
  icon,
}: DashboardEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      {icon && <div className="mb-4">{icon}</div>}
      <div className="text-lg font-medium">{title}</div>
      <div className="text-sm">{description}</div>
    </div>
  );
}

// ==================== Content Wrapper ====================

interface DashboardContentProps {
  children: ReactNode;
}

function DashboardContent({ children }: DashboardContentProps) {
  const { isLoading, error } = useDashboardContext();

  if (isLoading || error) return null;

  return <>{children}</>;
}

// ==================== Export Compound Component ====================

export const Dashboard = Object.assign(DashboardRoot, {
  Header: DashboardHeader,
  KPISection: DashboardKPISection,
  ChartsSection: DashboardChartsSection,
  TableSection: DashboardTableSection,
  Skeleton: DashboardSkeleton,
  Error: DashboardError,
  Empty: DashboardEmpty,
  Content: DashboardContent,
});

// Export types
export type {
  DashboardRootProps,
  DashboardHeaderProps,
  DashboardKPISectionProps,
  DashboardChartsSectionProps,
  DashboardTableSectionProps,
  DashboardErrorProps,
  DashboardEmptyProps,
  DashboardContentProps,
};
