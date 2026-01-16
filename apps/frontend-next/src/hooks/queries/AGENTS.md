<!-- Parent: ../AGENTS.md -->
# queries

## Purpose
React Query 기반 데이터 페칭 커스텀 훅입니다. 백엔드 API와 동기화되며, TTL 기반 캐싱을 적용합니다.

## Key Files
- `use-metrics.ts` - 메트릭 API 훅 (realtime, hourly, tenant-usage, cost-trend, heatmap 등)
- `use-admin.ts` - 관리자 CRUD 훅 (users, roles, filters)
- `use-dashboard.ts` - 대시보드별 통합 훅 (useBusinessDashboard, useOperationsDashboard 등)
- `index.ts` - 배럴 익스포트

## For AI Agents
- **쿼리 키 패턴**: `metricsKeys`, `adminKeys` 등 도메인별 키 팩토리 사용
- **캐시 TTL**: `CACHE_TIME.SHORT` (5분), `MEDIUM` (15분), `LONG` (1시간) - 백엔드 CacheService와 일치
- **뮤테이션 후 무효화**: `queryClient.invalidateQueries()` 패턴 사용
- **새 쿼리 추가 시**:
  1. 해당 도메인 파일에 쿼리 키 추가
  2. `use{도메인}` 훅 함수 작성
  3. index.ts에서 re-export
