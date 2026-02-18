# Learnings - date-filter-sync

## Conventions & Patterns
- BE는 `clampDays(days, defaultVal, max)` 헬퍼로 days 파라미터 검증
- FE hooks는 `days` 기본 파라미터를 사용, page에서 명시적으로 override
- DateRangeFilter는 `calculateDateRange(preset)` 로 프리셋별 날짜 자동 계산
- BE 캐시키는 `cacheService.generateKey('metrics', 'category', 'name', ...params)` 패턴

## Code Style
- SQL 쿼리는 template literal interpolation `${days}` 형식으로 parameterized (BigQuery 특성)
- BQ datasource는 `inputPricePerMillion`, `outputPricePerMillion` 같은 모델 상수 사용
- FE 대시보드 페이지는 hooks의 기본값에 의존 (page에서 days를 직접 관리하지 않음)

## Implementation Notes (2026-02-13)
- costTrend SQL 시그니처에 `days` 추가 시 price 파라미터 앞에 삽입됨 — 호출부 순서 주의
- BQ datasource 기본값(30)과 service 기본값(7)이 다름 — 의도적 설계 (datasource는 raw fallback, service가 비즈니스 기본값)
- `formatDate`를 KST로 변경 시 `new Date(date.getTime() + 9 * 60 * 60 * 1000)` 패턴 사용 (vanilla JS, 외부 라이브러리 금지)
- DateRange 인터페이스에 `startTime`, `endTime`, `startDateTime`, `endDateTime` 추가 — 모두 optional, 커스텀 모드에서만 사용
- 프리셋 클릭 시 시간 state를 빈 문자열로 리셋하여 프리셋 모드에서 시간 정보 미포함 보장
