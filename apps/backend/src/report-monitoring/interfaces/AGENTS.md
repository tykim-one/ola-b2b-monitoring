<!-- Parent: ../AGENTS.md -->
# interfaces

## Purpose
Report Monitoring 모듈의 TypeScript 타입/인터페이스 정의.

## Key Files
- `report-target.interface.ts` - 핵심 타입 정의
- `index.ts` - 타입 export

## Key Types
- `ReportType` - 리포트 타입 유니온 (`'ai_stock' | 'commodity' | 'forex' | 'dividend'`)
- `REPORT_TYPES` - 리포트 타입 상수 배열
- `ReportTarget` - DB에서 로드된 타겟 항목 (symbol, displayName, dividendYield?)
- `SymbolData` - DB에서 조회된 데이터 상세 (symbol, updatedAt, [key: string]: unknown)
- `ExistenceCheckResult` - 존재 여부 체크 결과 (existing: string[], missing: string[])
- `FreshnessCheckResult` - 신선도 체크 결과 (fresh, stale, staleDetails: {symbol, updatedAt, daysBehind}[])
- `CompletenessCheckResult` - 완전성 체크 결과 (complete, incomplete, suspicious, incompleteDetails: {symbol, missingFields}[], suspiciousDetails: {symbol, unchangedFields}[])
- `ReportCheckResult` - 단일 리포트 체크 결과 (존재/완전성/신선도 모두 포함, hasCriticalIssues, checkedAt)
- `MonitoringResult` - 전체 모니터링 결과 (results, summary: {totalReports, healthyReports, issueReports, totalMissing, totalIncomplete, totalSuspicious, totalStale}, timestamp)
- `ReportTableConfig` - DB 테이블 매핑 설정 (reportType, tableName, symbolColumn, updatedAtColumn)

## For AI Agents
- 새 리포트 타입 추가 시 `ReportType`과 `REPORT_TYPES`를 함께 수정
- `CompletenessCheckResult`는 v2 추가 타입 (NULL 체크 + 전날 비교)
- `incompleteDetails`는 NULL인 필드 목록, `suspiciousDetails`는 전날과 동일한 필드 목록 포함
