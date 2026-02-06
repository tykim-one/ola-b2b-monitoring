'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getServiceConfig } from '@/config/services';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import { ServiceCard } from '@/components/service';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';

export default function ServiceOverviewPage() {
  const params = useParams();
  const serviceId = params?.serviceId as string | undefined;
  const config = serviceId ? getServiceConfig(serviceId) : undefined;

  const { data, loading, error } = useServiceHealth({
    serviceId: serviceId || '',
    config: config!,
    refreshInterval: 30000,
    enabled: !!config && !!serviceId,
  });

  if (!config) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-gray-50">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
          <p className="text-rose-600">서비스를 찾을 수 없습니다: {serviceId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50 space-y-6">
      {/* 서비스 카드 */}
      <div className="max-w-2xl">
        <ServiceCard
          config={config}
          healthData={data || undefined}
          loading={loading}
        />
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
          <div className="flex items-start gap-3">
            <LucideIcons.AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-600 font-semibold mb-1">데이터 로드 실패</p>
              <p className="text-rose-500 text-sm">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* 정보 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 빠른 링크 */}
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <LucideIcons.Link className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">빠른 링크</h3>
          </div>
          <div className="space-y-2">
            {config.menu.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/services/${serviceId}${item.path}`}
                className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <span>{item.label}</span>
                <LucideIcons.ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* 서비스 정보 */}
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <LucideIcons.Info className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">서비스 정보</h3>
          </div>
          <dl className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <dt className="text-sm text-gray-500">서비스 ID</dt>
              <dd className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                {config.id}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <dt className="text-sm text-gray-500">타입</dt>
              <dd className="text-sm text-gray-900">
                <Badge variant="outline" className="bg-gray-100 border-gray-200 text-gray-700">
                  {config.type}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <dt className="text-sm text-gray-500">상태</dt>
              <dd className="text-sm">
                {data ? (
                  <Badge
                    variant="outline"
                    className={
                      data.status === 'healthy'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : data.status === 'warning'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }
                  >
                    {data.status === 'healthy'
                      ? '정상'
                      : data.status === 'warning'
                      ? '주의'
                      : '오류'}
                  </Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2">
              <dt className="text-sm text-gray-500">마지막 확인</dt>
              <dd className="text-sm text-gray-900">
                {data?.lastChecked
                  ? new Date(data.lastChecked).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

    </div>
  );
}

