'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center h-full bg-gray-50">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h2>
      <p className="text-gray-500 mb-6">
        이 페이지에 접근할 권한이 부족합니다. 관리자에게 문의하세요.
      </p>
      <Link
        href="/dashboard/home"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        대시보드 홈으로
      </Link>
    </div>
  </div>
);

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback,
}) => {
  const { hasPermission, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!hasPermission(permission)) {
    return fallback ? <>{fallback}</> : <DefaultFallback />;
  }

  return <>{children}</>;
};
