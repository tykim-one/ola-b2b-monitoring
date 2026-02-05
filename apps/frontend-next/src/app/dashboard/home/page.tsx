'use client';

import { ServiceCard } from '@/components/service';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import { serviceConfigs } from '@/config/services';

export default function HomePage() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">서비스 모니터링</h1>
        <p className="text-gray-500">전체 서비스 상태를 한눈에 확인하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {serviceConfigs.map((config) => (
          <ServiceCardWithHealth
            key={config.id}
            config={config}
            onClick={() => {
              window.location.href = `/dashboard/services/${config.id}`;
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface ServiceCardWithHealthProps {
  config: any;
  onClick: () => void;
}

function ServiceCardWithHealth({ config, onClick }: ServiceCardWithHealthProps) {
  const { data, loading } = useServiceHealth({
    serviceId: config.id,
    config,
    refreshInterval: 30000,
  });

  return <ServiceCard config={config} healthData={data || undefined} loading={loading} onClick={onClick} />;
}
