'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getServiceMapping, type ServiceMapping } from '@/config/service-mapping';
import { getServiceConfig } from '@/config/services';
import type { ServiceConfig } from '@ola/shared-types';

export interface ServiceContext extends ServiceMapping {
  serviceId: string;
  config: ServiceConfig | undefined;
}

export function useServiceContext(): ServiceContext | null {
  const params = useParams();
  const serviceId = params?.serviceId as string | undefined;

  // useMemo로 객체 참조 안정화 - serviceId가 변경될 때만 새 객체 생성
  // 이를 통해 useEffect 의존성에서 불필요한 재실행 방지
  return useMemo(() => {
    if (!serviceId) return null;

    const mapping = getServiceMapping(serviceId);
    const config = getServiceConfig(serviceId);

    if (!mapping) return null;

    return {
      serviceId,
      ...mapping,
      config,
    };
  }, [serviceId]);
}
