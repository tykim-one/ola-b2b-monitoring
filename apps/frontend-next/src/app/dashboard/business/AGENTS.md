<!-- Parent: ../AGENTS.md -->
# business

## Purpose
비즈니스 분석 대시보드 페이지입니다. 테넌트별 사용량, 비용 트렌드, 사용량 히트맵을 표시합니다.

## Key Files
- `page.tsx` - 비즈니스 대시보드 페이지 컴포넌트

## For AI Agents
- API 엔드포인트: `/analytics/tenant-usage`, `/analytics/cost-trend`, `/analytics/heatmap`
- 차트: TenantPieChart, CostTrendChart, UsageHeatmap
