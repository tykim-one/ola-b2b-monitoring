<!-- Parent: ../AGENTS.md -->
# charts

## Purpose
Recharts 라이브러리 기반 데이터 시각화 차트 컴포넌트들입니다.

## Key Files
- `chart-theme.ts` - Recharts 라이트 테마 공통 상수 (CHART_COLORS, TOOLTIP_STYLE)
- `RealtimeTrafficChart.tsx` - 시간별 트래픽 영역 차트
- `CostTrendChart.tsx` - 일별 비용 트렌드 라인 차트
- `UsageHeatmap.tsx` - 요일x시간 사용량 히트맵
- `TenantPieChart.tsx` - 테넌트별 사용량 파이 차트
- `TokenScatterPlot.tsx` - 토큰 효율성 산점도
- `ErrorGauge.tsx` - 에러율 게이지 (RadialBar)
- `TokenEfficiencyTrendChart.tsx` - 일별 토큰 효율성 트렌드 라인 차트
- `QueryResponseScatterPlot.tsx` - 질문-응답 길이 상관관계 산점도 (모달 상세 보기 기능)
- `UserRequestsBarChart.tsx` - 유저별 요청 수 가로 막대 차트 (x_enc_data 기준)
- `UserTokensPieChart.tsx` - 유저별 토큰 사용량 파이 차트 (입력/출력/전체 토글)
- `UserActivityDialog.tsx` - 유저 활동 상세 다이얼로그 (대화 이력, 기간 필터, 페이지네이션)
- `ProblematicChatDialog.tsx` - 문제성 채팅 상세 다이얼로그

## For AI Agents
- **테마**: `chart-theme.ts`에서 공통 스타일 상수 import (CHART_COLORS, TOOLTIP_STYLE)
- 모든 차트는 ResponsiveContainer로 래핑
- 데이터는 props로 전달받음
- 색상 팔레트: Tailwind 색상 + 테마 상수 혼용
- 라이트 테마: bg-white, 그리드 #e2e8f0, 축 텍스트 #64748b
- 새 차트 추가 시 Recharts 문서 참조: https://recharts.org
- 삭제된 파일: `ProblematicChatTable.tsx`, `RepeatedQueriesTable.tsx`, `UserListTable.tsx`, `UserPatternsTable.tsx` (다른 컴포넌트로 대체)
