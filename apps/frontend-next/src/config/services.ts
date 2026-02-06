// apps/frontend-next/src/config/services.ts

import type { ServiceConfig } from '@ola/shared-types';

export const serviceConfigs: ServiceConfig[] = [
  {
    id: 'ibk-chat',
    name: 'IBK 챗봇',
    type: 'chatbot',
    icon: 'MessageSquare',
    description: '챗봇 품질관리 모니터링',
    card: {
      kpis: [
        { key: 'activeSessions', label: '활성 세션', format: 'number' },
        { key: 'resolutionRate', label: '해결률', format: 'percentage', thresholds: { warning: 80, error: 60 } },
        { key: 'avgResponseTime', label: '평균 응답', format: 'duration' },
      ],
      chart: { type: 'line', dataKey: 'traffic', label: '실시간 트래픽' }
    },
    menu: [
      { id: 'quality', label: '품질 분석', path: '/quality' },
      { id: 'users', label: '유저 분석', path: '/users' },
      { id: 'ai-performance', label: 'AI 성능', path: '/ai-performance' },
      { id: 'batch-analysis', label: '배치 분석', path: '/batch-analysis' },
      { id: 'business', label: '비즈니스 분석', path: '/business' },
    ]
  },
  {
    id: 'ibk',
    name: 'IBK 리포트',
    type: 'batch',
    icon: 'FileBarChart',
    description: '일일 리포트 자동생성, DB 배치 모니터링',
    card: {
      kpis: [
        { key: 'lastRunTime', label: '마지막 실행', format: 'duration' },
        { key: 'successRate', label: '성공률', format: 'percentage', thresholds: { warning: 95, error: 90 } },
        { key: 'dataLoadStatus', label: '데이터 적재', format: 'number' },
      ],
      chart: { type: 'status-list', dataKey: 'recentJobs', label: '최근 작업' }
    },
    menu: [
      { id: 'status', label: '배치 현황', path: '/status' },
      { id: 'data-loading', label: '데이터 적재', path: '/data-loading' },
    ]
  },
  {
    id: 'wind-etl',
    name: 'Wind ETL',
    type: 'pipeline',
    icon: 'FileText',
    description: '파일처리 모니터링',
    card: {
      kpis: [
        { key: 'processing', label: '처리 중', format: 'number' },
        { key: 'queued', label: '대기', format: 'number' },
        { key: 'successRate', label: '성공률', format: 'percentage', thresholds: { warning: 95, error: 90 } },
      ],
      chart: { type: 'progress', dataKey: 'dailyProgress', label: '오늘 처리량' }
    },
    menu: [
      { id: 'status', label: '처리 현황', path: '/status' },
      { id: 'logs', label: '에러 로그', path: '/logs' },
    ]
  },
  {
    id: 'minkabu-etl',
    name: 'Minkabu ETL',
    type: 'pipeline',
    icon: 'Languages',
    description: '뉴스 번역 처리 모니터링',
    card: {
      kpis: [
        { key: 'processing', label: '처리 중', format: 'number' },
        { key: 'queued', label: '대기', format: 'number' },
        { key: 'successRate', label: '성공률', format: 'percentage', thresholds: { warning: 95, error: 90 } },
      ],
      chart: { type: 'progress', dataKey: 'dailyProgress', label: '오늘 처리량' }
    },
    menu: [
      { id: 'status', label: '번역 현황', path: '/status' },
      { id: 'logs', label: '에러 로그', path: '/logs' },
    ]
  },
];

// 서비스 ID로 설정 찾기
export function getServiceConfig(serviceId: string): ServiceConfig | undefined {
  return serviceConfigs.find(s => s.id === serviceId);
}

// 서비스 타입별로 그룹핑
export function getServicesByType(type: ServiceConfig['type']): ServiceConfig[] {
  return serviceConfigs.filter(s => s.type === type);
}
