export interface ServiceMapping {
  projectId: string;
  tenantId?: string;
  apiPrefix: string;
  etlApiPrefix?: string; // ETL 서비스용
}

export const SERVICE_PROJECT_MAPPING: Record<string, ServiceMapping> = {
  'ibk-chat': {
    projectId: 'ibks',
    tenantId: 'ibk',
    apiPrefix: '/projects/ibks/api',
  },
  'ibk': {
    projectId: 'ibks',
    apiPrefix: '/projects/ibks/api',
  },
  'wind-etl': {
    projectId: 'wind',
    apiPrefix: '/api/wind-etl',
    etlApiPrefix: '/api/wind-etl',
  },
  'minkabu-etl': {
    projectId: 'minkabu',
    apiPrefix: '/api/minkabu-etl',
    etlApiPrefix: '/api/minkabu-etl',
  },
};

export function getServiceMapping(serviceId: string): ServiceMapping | undefined {
  return SERVICE_PROJECT_MAPPING[serviceId];
}
