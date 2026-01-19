<!-- Parent: ../AGENTS.md -->

# Batch Analysis Module

매일 전날의 채팅 데이터를 자동으로 분석하여 DB에 저장하는 배치 파이프라인 모듈입니다.

## Purpose

- BigQuery에서 일별 채팅 데이터 샘플 추출
- LLM을 사용한 자동 품질 분석
- 분석 결과 SQLite DB 저장
- 스케줄러를 통한 자동 일일 실행

## Key Files

| File | Description |
|------|-------------|
| `batch-analysis.module.ts` | NestJS 모듈 정의, 의존성 설정 |
| `batch-analysis.service.ts` | 핵심 서비스 (작업 생성, 실행, 결과 관리) |
| `batch-analysis.controller.ts` | REST API 엔드포인트 |
| `batch-analysis.scheduler.ts` | 동적 크론 스케줄러 (DB 설정 기반, 다중 스케줄 지원) |
| `dto/` | 요청/응답 DTO 정의 |
| `interfaces/batch-analysis.interface.ts` | 타입 정의 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/batch-analysis/jobs` | 작업 목록 조회 |
| GET | `/api/admin/batch-analysis/jobs/:id` | 작업 상세 조회 |
| POST | `/api/admin/batch-analysis/jobs` | 수동 작업 생성 |
| POST | `/api/admin/batch-analysis/jobs/:id/run` | 작업 실행 |
| DELETE | `/api/admin/batch-analysis/jobs/:id` | 작업 삭제 |
| GET | `/api/admin/batch-analysis/results` | 분석 결과 조회 |
| GET | `/api/admin/batch-analysis/prompts` | 프롬프트 템플릿 목록 |
| POST | `/api/admin/batch-analysis/prompts` | 프롬프트 생성 |
| PUT | `/api/admin/batch-analysis/prompts/:id` | 프롬프트 수정 |
| DELETE | `/api/admin/batch-analysis/prompts/:id` | 프롬프트 삭제 |
| GET | `/api/admin/batch-analysis/stats` | 통계 조회 |
| GET | `/api/admin/batch-analysis/schedules` | 스케줄 목록 조회 |
| GET | `/api/admin/batch-analysis/schedules/:id` | 스케줄 상세 조회 |
| POST | `/api/admin/batch-analysis/schedules` | 스케줄 생성 |
| PUT | `/api/admin/batch-analysis/schedules/:id` | 스케줄 수정 |
| DELETE | `/api/admin/batch-analysis/schedules/:id` | 스케줄 삭제 |
| POST | `/api/admin/batch-analysis/schedules/:id/toggle` | 스케줄 활성화 토글 |
| GET | `/api/admin/batch-analysis/tenants` | 사용 가능한 테넌트 목록 |
| POST | `/api/admin/batch-analysis/migrate-parse-fields` | 기존 결과 파싱 필드 마이그레이션 |
| GET | `/api/admin/batch-analysis/issue-frequency` | 이슈 빈도 분석 (가장 빈번한 이슈 집계) |

## Database Models

- `BatchAnalysisJob`: 배치 분석 작업 (상태, 대상 날짜, 진행률)
- `BatchAnalysisResult`: 개별 분석 결과 (원본 데이터, LLM 응답, **파싱된 점수 필드**)
- `AnalysisPromptTemplate`: 분석 프롬프트 템플릿
- `BatchSchedulerConfig`: 스케줄러 설정 (시간, 요일, 테넌트, 샘플 수)

### BatchAnalysisResult 파싱 필드

LLM 응답에서 자동으로 추출되는 구조화된 필드:

| 필드 | 타입 | 설명 |
|------|------|------|
| `qualityScore` | Int? | 품질 점수 (1-10) |
| `relevance` | Int? | 관련성 점수 (1-10) |
| `completeness` | Int? | 완성도 점수 (1-10) |
| `clarity` | Int? | 명확성 점수 (1-10) |
| `sentiment` | String? | 감정 (positive/neutral/negative) |
| `summaryText` | String? | 한 줄 요약 |
| `issues` | String? | JSON 배열 - 문제점 목록 |
| `improvements` | String? | JSON 배열 - 개선 제안 |
| `issueCount` | Int? | issues 배열 길이 |
| `avgScore` | Float? | 4개 점수의 평균 |

이 필드들을 사용해 집계 쿼리 가능:
```sql
SELECT tenantId, AVG(avgScore) FROM BatchAnalysisResult GROUP BY tenantId;
SELECT * FROM BatchAnalysisResult WHERE qualityScore < 5;
```

## Configuration

환경변수:
```
BATCH_ANALYSIS_SCHEDULER_ENABLED=true  # 스케줄러 활성화
```

## For AI Agents

- 작업 상태: PENDING → RUNNING → COMPLETED/FAILED
- BigQuery 쿼리는 `metrics.queries.ts`의 `chatSamplesForAnalysis` 사용
- LLM 분석은 `admin/analysis/llm/llm.service.ts` 의존
- 스케줄러는 `BatchSchedulerConfig` 테이블에서 동적으로 로드됨
- 다중 스케줄 지원: 시간/요일별로 여러 스케줄 등록 가능
- `SchedulerRegistry`를 사용해 런타임에 cron job 추가/제거
- **`parseAnalysisResult()` 함수**: LLM JSON 응답을 파싱하여 구조화된 필드로 추출
  - 마크다운 코드 블록(` ```json ... ``` `)을 자동으로 제거
  - JSON 파싱 실패 시 모든 필드가 null로 저장됨
- **`listJobs()`**: 각 Job별 평균 점수 집계(`scoreStats`)를 함께 반환
- **`listResults()`**: 필터 파라미터 지원 (minAvgScore, maxAvgScore, sentiment, hasIssues)
- **`getIssueFrequency()`**: issues 필드에서 빈도 집계, 샘플 결과 포함
- **`migrateParseFields()`**: 기존 데이터 중 파싱되지 않은 결과를 일괄 업데이트
- 모든 프롬프트 템플릿은 표준 출력 포맷(quality_score, relevance 등) 준수 필요

## Dependencies

- `@nestjs/schedule`: 크론 스케줄링
- `DatabaseModule`: Prisma 서비스
- `LLMModule`: LLM 분석 서비스
