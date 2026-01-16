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
| `batch-analysis.scheduler.ts` | 크론 스케줄러 (매일 02:00 실행) |
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

## Database Models

- `BatchAnalysisJob`: 배치 분석 작업 (상태, 대상 날짜, 진행률)
- `BatchAnalysisResult`: 개별 분석 결과 (원본 데이터, LLM 응답, 메타데이터)
- `AnalysisPromptTemplate`: 분석 프롬프트 템플릿

## Configuration

환경변수:
```
BATCH_ANALYSIS_SCHEDULER_ENABLED=true  # 스케줄러 활성화
```

## For AI Agents

- 작업 상태: PENDING → RUNNING → COMPLETED/FAILED
- BigQuery 쿼리는 `metrics.queries.ts`의 `chatSamplesForAnalysis` 사용
- LLM 분석은 `admin/analysis/llm/llm.service.ts` 의존
- 스케줄러는 기본적으로 비활성화됨 (환경변수로 활성화)

## Dependencies

- `@nestjs/schedule`: 크론 스케줄링
- `DatabaseModule`: Prisma 서비스
- `LLMModule`: LLM 분석 서비스
