<!-- Parent: ../AGENTS.md -->
# dto

## Purpose
Report Monitoring API의 요청/응답 DTO 정의. Swagger 문서 자동 생성을 위한 데코레이터 포함.

## Key Files
- `monitoring-result.dto.ts` - 모니터링 결과 DTO (`MonitoringResultDto`, `ReportCheckResultDto`)
- `index.ts` - DTO export

## For AI Agents
- `@ApiProperty()` 데코레이터로 Swagger 문서화
- 인터페이스 파일(`interfaces/`)의 타입을 implements하여 일관성 보장
- DTO 클래스: `MonitoringResultDto`, `ReportCheckResultDto`, `MonitoringSummaryDto`, `StaleDetailDto`
