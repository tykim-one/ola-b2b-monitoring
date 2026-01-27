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
- `ReportTarget` - CSV에서 로드된 타겟 항목
- `ReportCheckResult` - 단일 리포트 체크 결과
- `MonitoringResult` - 전체 모니터링 결과
- `ReportTableConfig` - DB 테이블 매핑 설정
- `ExistenceCheckResult`, `FreshnessCheckResult` - 체크 결과 타입

## For AI Agents
- 새 리포트 타입 추가 시 `ReportType`과 `REPORT_TYPES`를 함께 수정
- `staleDetails`는 업데이트 시간과 지연 일수를 포함
