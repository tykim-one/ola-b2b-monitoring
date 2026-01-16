<!-- Parent: ../AGENTS.md -->
# charts

## Purpose
Recharts 라이브러리 기반 데이터 시각화 차트 컴포넌트들입니다.

## Key Files
- `RealtimeTrafficChart.tsx` - 시간별 트래픽 영역 차트
- `CostTrendChart.tsx` - 일별 비용 트렌드 라인 차트
- `UsageHeatmap.tsx` - 요일x시간 사용량 히트맵
- `TenantPieChart.tsx` - 테넌트별 사용량 파이 차트
- `TokenScatterPlot.tsx` - 토큰 효율성 산점도
- `ErrorGauge.tsx` - 에러율 게이지
- `TokenEfficiencyTrendChart.tsx` - 일별 토큰 효율성 트렌드 라인 차트
- `QueryResponseScatterPlot.tsx` - 질문-응답 길이 상관관계 산점도
- `RepeatedQueriesTable.tsx` - 반복 질문 패턴 테이블 (FAQ 후보)

## For AI Agents
- 모든 차트는 ResponsiveContainer로 래핑
- 데이터는 props로 전달받음
- 색상 팔레트: Tailwind 색상 사용
- 새 차트 추가 시 Recharts 문서 참조: https://recharts.org
