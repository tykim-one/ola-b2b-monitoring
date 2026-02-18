# Issues & Gotchas - date-filter-sync

## Known Issues
- `formatDate`의 `toISOString().split('T')[0]`는 UTC 기반 — KST 자정에 날짜가 하루 전으로 표시됨 (Task C에서 수정)
- operations/services/ai-performance 대시보드가 기존 1일이었던 것은 실시간 모니터링 의도 가능성 있음 (사용자 요청으로 7일 변경)

## Watch Out
- `costTrend` SQL의 `inputPricePerMillion`, `outputPricePerMillion` 파라미터는 유지 필수
- `queryPatterns` 엔드포인트도 하드코딩 있지만 이번 scope 외
- shared-types에 DateRange가 있을 수 있음 — 확인 필요
