<!-- Parent: ../AGENTS.md -->
# business

## Purpose
비즈니스 메트릭 페이지입니다. 테넌트별 사용량, 비용 트렌드, 히트맵 등 경영 지표를 제공합니다.

## Key Files
- `page.tsx` - 비즈니스 KPI, TenantPieChart, CostTrendChart, UsageHeatmap

## For AI Agents
- **테넌트 사용량**: 토큰, 요청 수, 비용 기준 테넌트별 분포
- **비용 트렌드**: 일별 비용 추세 (입력/출력 토큰 구분)
- **히트맵**: 시간대별 사용량 패턴 (요일 × 시간)

## Dependencies
- Backend: `/api/analytics/*` (테넌트 사용량, 비용 트렌드, 히트맵)
- Components: TenantPieChart, CostTrendChart, UsageHeatmap
- Hooks: use-dashboard.ts
