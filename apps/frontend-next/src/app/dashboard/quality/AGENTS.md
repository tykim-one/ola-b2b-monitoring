<!-- Parent: ../AGENTS.md -->
# quality/

## Purpose
품질 분석 페이지. 토큰 효율성 트렌드, 메트릭 간 상관관계, 반복 패턴을 분석합니다.

## Key Files
- `page.tsx` - 품질 분석 대시보드 (효율성 트렌드, 상관관계 히트맵, 패턴 테이블)

## Subdirectories
없음

## For AI Agents
- **URL 경로**: `/dashboard/quality`
- **주요 기능**:
  - EfficiencyTrendChart: 일별 토큰 효율성 트렌드 (토큰당 요청 수)
  - CorrelationHeatmap: 메트릭 간 상관관계 히트맵
  - DataTable: 반복 패턴 목록 (빈도, 평균 토큰, 에러율)
- **데이터 소스**: `useQualityDashboard` 훅
- **메트릭**: 평균 효율성, 최고/최저 효율성 KPI

## Dependencies
- `@/hooks/queries/use-dashboard` - useQualityDashboard
- `@/components/compound/Dashboard`
- `@/components/kpi/KPICard`
- `@/components/charts/*` - EfficiencyTrendChart, CorrelationHeatmap
- `@ola/shared-types` - EfficiencyTrend, Correlation, RepeatPattern
