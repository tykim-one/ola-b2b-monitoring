'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getServiceConfig } from '@/config/services';
import * as LucideIcons from 'lucide-react';

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const serviceId = params?.serviceId as string | undefined;
  const config = serviceId ? getServiceConfig(serviceId) : undefined;

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">서비스를 찾을 수 없습니다</h1>
          <p className="text-gray-500 mb-4">서비스 ID: {serviceId}</p>
          <Link
            href="/dashboard/home"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            대시보드 홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const Icon = (LucideIcons as Record<string, unknown>)[config.icon] as React.ComponentType<{ className?: string }> || LucideIcons.HelpCircle;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 서비스 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-50 rounded-xl">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{config.name}</h1>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
        </div>

        {/* 서브 네비게이션 */}
        <nav className="flex gap-1">
          <Link
            href={`/dashboard/services/${serviceId}`}
            className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            개요
          </Link>
          {config.menu.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/services/${serviceId}${item.path}`}
              className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
