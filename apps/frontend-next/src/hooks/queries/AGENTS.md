<!-- Parent: ../AGENTS.md -->
# queries

## Purpose
React Query 기반 데이터 페칭 커스텀 훅입니다. 백엔드 API와 동기화되며, TTL 기반 캐싱을 적용합니다.

## Key Files
- `use-metrics.ts` - 메트릭 API 훅 (realtime, hourly, tenant-usage, cost-trend, heatmap 등)
- `use-admin.ts` - 관리자 CRUD 훅 (users, roles, filters, analysis sessions)
- `use-dashboard.ts` - 대시보드별 통합 훅 (useBusinessDashboard, useOperationsDashboard 등)
- `use-quality.ts` - 품질 분석 훅 (반복 쿼리, 효율성, 상관관계, 챗봇 품질)
- `use-user-analytics.ts` - 유저 분석 훅 (요청 수, 토큰 사용량, 질문 패턴, 활동 내역)
- `use-faq-analysis.ts` - FAQ 분석 훅 (클러스터링 실행, 테넌트 목록)
- `use-session-analysis.ts` - 세션 분석 훅 (통계, 목록, 타임라인, LLM 분석)
- `use-log-analysis.ts` - 로그 분석 훅
- `use-batch-schedules.ts` - 배치 스케줄 훅 (목록, 생성, 수정, 삭제, 토글)
- `use-etl.ts` - ETL 모니터링 훅 (Wind, Minkabu)
- `use-report-monitoring.ts` - 보고서 모니터링 훅 (상태, 실행, 헬스체크)
- `index.ts` - 배럴 익스포트

## For AI Agents
- **쿼리 키 패턴**: `metricsKeys`, `adminKeys` 등 도메인별 키 팩토리 사용
- **캐시 TTL**: `CACHE_TIME.SHORT` (5분), `MEDIUM` (15분), `LONG` (1시간) - 백엔드 CacheService와 일치
- **뮤테이션 후 무효화**: `queryClient.invalidateQueries()` 패턴 사용
- **새 쿼리 추가 시**:
  1. 해당 도메인 파일에 쿼리 키 추가
  2. `use{도메인}` 훅 함수 작성
  3. index.ts에서 re-export
