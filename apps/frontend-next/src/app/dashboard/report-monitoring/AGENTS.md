<!-- Parent: ../../AGENTS.md -->
# report-monitoring

## Purpose
리포트 데이터 모니터링 대시보드 페이지. 4종 리포트(AI Stock, Commodity, Forex, Dividend)의 데이터 품질 상태를 실시간으로 시각화합니다.

## Key Files
- `page.tsx` - 대시보드 페이지 컴포넌트

## Features
- KPI 카드: 전체 리포트 수, 정상/이슈 리포트 수, 누락/오래된 데이터 수
- 리포트별 상세 카드: 존재 여부, 신선도, 이슈 심볼 목록
- 헬스 상태 표시: DB 연결, 스케줄러 상태
- 수동 체크 실행 버튼
- 5분 자동 새로고침

## For AI Agents
- `reportMonitoringService.ts`의 API 클라이언트 사용
- 확장/축소 가능한 이슈 상세 목록 (최대 10개 표시)
- `checking` 상태일 때 자동 새로고침 스킵
- 상태: `healthy`, `degraded`, `unhealthy`

## Dependencies
- `@/services/reportMonitoringService` - API 클라이언트
- `@/components/kpi/KPICard` - KPI 표시 컴포넌트
- `lucide-react` - 아이콘
