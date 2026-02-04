<!-- Parent: ../AGENTS.md -->
# dto

## Purpose
Report Monitoring API의 요청/응답 DTO 정의. Swagger 문서 자동 생성을 위한 ApiProperty 데코레이터 포함.

## Key Files
- `monitoring-result.dto.ts` - 모니터링 결과 DTO 클래스
  - `StaleDetailDto` - 오래된 데이터 상세 (symbol, updatedAt, daysBehind)
  - `IncompleteDetailDto` - 불완전 데이터 상세 (symbol, missingFields: string[])
  - `SuspiciousDetailDto` - 확인필요 데이터 상세 (symbol, unchangedFields: string[])
  - `ReportCheckResultDto` - 단일 리포트 체크 결과 (존재 여부, 완전성, 신선도 필드 모두 포함)
  - `MonitoringSummaryDto` - 전체 요약 (totalReports, healthyReports, issueReports, totalMissing, totalIncomplete, totalSuspicious, totalStale)
  - `MonitoringResultDto` - 전체 모니터링 결과 (results: ReportCheckResultDto[], summary, timestamp)
  - `CheckReportParamDto` - 파라미터 DTO (reportType)
- `index.ts` - DTO export

## For AI Agents
- `@ApiProperty()`, `@ApiPropertyOptional()` 데코레이터로 Swagger 문서화
- 인터페이스 파일(`interfaces/report-target.interface.ts`)의 타입을 implements하여 일관성 보장
- 완전성 체크 추가로 incompleteDetails, suspiciousDetails 필드 포함됨
