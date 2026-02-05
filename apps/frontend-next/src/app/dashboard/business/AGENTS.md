<!-- Parent: ../AGENTS.md -->
# business/

## Purpose
비즈니스 분석 메트릭 페이지. 테넌트별 토큰 사용량, 예상 비용, 일별 트렌드, 시간대별 히트맵을 시각화합니다.

## Key Files
- `page.tsx` - 비즈니스 대시보드 페이지 (KPI 카드, 차트, 테넌트 테이블)

## Subdirectories
없음

## For AI Agents
- **URL 경로**: `/dashboard/business`
- **주요 기능**:
  - 4개 KPI 카드: 총 토큰 사용량, 예상 비용, 총 요청 수, 활성 테넌트
  - TenantPieChart: 테넌트별 토큰 사용량 파이 차트
  - CostTrendChart: 일별 비용 트렌드 라인 차트
  - UsageHeatmap: 시간대별 사용량 히트맵
  - DataTable: 테넌트별 상세 현황 (요청 수, 토큰, 에러율)
- **데이터 소스**: `useBusinessDashboard` 훅 (React Query)
- **날짜 범위**: DateRangeFilter로 7/30/90일 선택 가능
- **테이블 검색**: tenant_id로 검색

## Dependencies
- `@/hooks/queries/use-dashboard` - useBusinessDashboard
- `@/components/compound/Dashboard` - 레이아웃
- `@/components/kpi/KPICard` - KPI 카드
- `@/components/charts/*` - TenantPieChart, CostTrendChart, UsageHeatmap
- `@/components/compound/DataTable` - 테넌트 테이블
- `@ola/shared-types` - TenantUsage 타입
