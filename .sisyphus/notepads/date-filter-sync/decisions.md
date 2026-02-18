# Architectural Decisions - date-filter-sync

## 2026-02-13: 기본값 7일 통일
- operations 대시보드도 1일→7일 변경 (사용자 명시 요청)
- BE controller clampDays 기본값도 모두 7일로 통일 (FE-BE 일관성)
- FE hook 기본 파라미터도 7일 통일 (코드 일관성, page가 항상 override하므로 실제 영향 미미)

## 2026-02-13: Task C 시간 선택은 FE-only
- DateRange에 startTime/endTime optional 필드 추가
- BE API는 여전히 `days` 숫자만 받음 (startDate/endDate 파라미터는 별도 스코프)
- 시간 정보는 FE 표시 및 UX 개선 용도

## 2026-02-13: KST 처리 방식
- `formatDate`는 `Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul' })` 또는 UTC+9 offset 적용
- BigQuery SQL은 이미 `DATE(timestamp, 'Asia/Seoul')` 사용 중이므로 변경 불필요
