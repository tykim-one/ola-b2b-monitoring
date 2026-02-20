# IBK-CHAT 일일 리포트 생성 시스템

## TL;DR

> **Quick Summary**: BigQuery IBK-CHAT 로그를 KST 기준 하루치 집계한 뒤, Gemini LLM으로 섹션 A-G 포함 종합 Markdown 리포트를 자동 생성·저장하는 독립 모듈을 신설한다. 매일 새벽 2시 KST 스케줄러로 전날 리포트를 자동 생성하고, 수동 생성 API 및 프론트엔드 뷰어도 제공한다.
>
> **Deliverables**:
> - `apps/backend/src/ibk-chat-report/` 신규 NestJS 모듈 (module, controller, service, scheduler, queries)
> - Prisma 모델 `IbkChatDailyReport` + SQLite 마이그레이션
> - BigQuery 쿼리 7종 (IBK-CHAT 특화 필드: response_node, fail_reason, question_type, data_categories)
> - 수준있는질문 휴리스틱 스코어링 엔진 (5개 기준 키워드 매칭)
> - LLM 컨텍스트 빌더 + Gemini 단일 호출로 섹션 A-G Markdown 생성
> - REST API 5개 엔드포인트
> - 프론트엔드: 리포트 목록 페이지 + Markdown 뷰어 (`/ibks/ibk-chat/daily-report`)
> - IBK 챗봇 사이드바 메뉴에 "일일 리포트" 항목 추가
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T1(Prisma) → T7(BigQuery 서비스) → T11(Report 오케스트레이터) → T12(API 컨트롤러)

---

## Context

### Original Request
IBK-CHAT 일일 리포트 추가 요청. 기존 BigQuery Dataset 형식 유지, 동일 테이블에 IBK-CHAT 특화 필드(`response_node`, `fail_reason`, `question_type`, `data_categories`, `created_at_utc`) 추가. LLM 기반 종합 리포트 (섹션 A-G).

### Interview Summary
**Key Discussions**:
- **모듈 구조**: 기존 `batch-analysis/`와 분리된 새 독립 모듈
- **BigQuery 테이블**: 동일 테이블 (BIGQUERY_TABLE 환경변수), IBK-CHAT 특화 필드가 추가되어 있음
- **클러스터링**: LLM 기반, 고정 클러스터 검증 키워드/항목은 매일 동일하게 유지
- **저장 방식**: SQLite DB + Markdown 텍스트 (Prisma)
- **프론트엔드**: 리포트 목록 + Markdown 뷰어 필요

### Metis Review
**Identified Gaps** (addressed):
- ETN 정의 불명확 → "기타(ETN)" 레이블로 표시, 코멘트 추가
- 재생성 요청 시 충돌 → UPSERT 전략(기존 RUNNING/COMPLETED 덮어쓰기 명시)
- 동시 실행 방지 → RUNNING 상태 체크 후 409 에러 반환
- 서버 재시작 시 RUNNING 리포트 → onModuleInit에서 RUNNING → FAILED 리셋
- 최소 데이터 임계값 → 50건 미만이면 `SKIPPED` 상태로 저장
- BigQuery 필드 NULL 처리 → `SAFE_CAST`, `COALESCE`, `IS NOT NULL` 조건 명시
- 수준있는질문 LLM 개입 범위 → 휴리스틱 점수만으로 Top30 확정 (LLM은 설명 텍스트 생성만)
- 과거 클러스터 비교 → v1에서는 당일 데이터만, 과거 비교 제외
- Slack 알림 → 기존 SlackNotificationService 재사용 (실패/완료 알림)

---

## Work Objectives

### Core Objective
IBK-CHAT BigQuery 로그를 날짜 기준으로 집계하고, LLM이 섹션 A-G를 포함한 Markdown 일일 리포트를 자동 생성하는 시스템을 구축한다. 리포트는 SQLite에 저장되며 API와 프론트엔드로 조회 가능하다.

### Concrete Deliverables
- `apps/backend/src/ibk-chat-report/ibk-chat-report.module.ts`
- `apps/backend/src/ibk-chat-report/ibk-chat-report.service.ts`
- `apps/backend/src/ibk-chat-report/ibk-chat-report.controller.ts`
- `apps/backend/src/ibk-chat-report/ibk-chat-report.scheduler.ts`
- `apps/backend/src/ibk-chat-report/queries/ibk-chat-report.queries.ts`
- `apps/backend/src/ibk-chat-report/services/data-collector.service.ts`
- `apps/backend/src/ibk-chat-report/services/question-scorer.service.ts`
- `apps/backend/src/ibk-chat-report/services/report-builder.service.ts`
- `apps/backend/prisma/schema.prisma` (IbkChatDailyReport 모델 추가)
- 프론트엔드: `apps/frontend-next/src/app/dashboard/services/[serviceId]/daily-report/` (serviceId=ibk-chat)
- 프론트엔드: `apps/frontend-next/src/hooks/queries/use-ibk-chat-report.ts`

### Definition of Done
- [ ] `GET /projects/ibks/api/ibk-chat-report` → 리포트 목록 반환 (200)
- [ ] `POST /projects/ibks/api/ibk-chat-report/generate` → 수동 생성 트리거 (202)
- [ ] `GET /projects/ibks/api/ibk-chat-report/:date` → 특정 날짜 리포트 반환 (200)
- [ ] 생성 완료된 리포트 `reportMarkdown`에 섹션 A-G 모두 포함
- [ ] 프론트엔드 `/dashboard/services/ibk-chat/daily-report` 페이지에서 목록+뷰어 동작
- [ ] 스케줄러 cron 등록 확인 (로그 메시지 확인)
- [ ] Prisma `IbkChatDailyReport` 테이블 생성 확인

### Must Have
- KST(Asia/Seoul) 기준 날짜 필터링 (`DATE(timestamp, 'Asia/Seoul')`)
- 섹션 A-G 모두 포함된 Markdown 출력
- 수동 생성 API (POST /generate) + 동시 실행 방지 (RUNNING 체크)
- 최소 50건 미만 날짜는 `SKIPPED` 처리
- 재생성 시 기존 데이터 삭제 후 재생성 (UPSERT)
- Slack 알림 연동 (완료/실패)
- `onModuleInit` 에서 RUNNING 상태 리포트 → FAILED 리셋

### Must NOT Have (Guardrails)
- 과거 날짜 리포트와의 비교/diff 기능 (v1 제외)
- 임베딩 기반 벡터 클러스터링 (LLM 키워드 분류만)
- 리포트 "수준있는질문" Top30 선정에 LLM 재순위화 (휴리스틱만)
- 고객사(IBK) 직접 공유용 형식 (내부 분석용 Draft 품질)
- 섹션 F 추천 질문 "완성된 프롬프트" 형태 아님 (가이드용)
- 수동 생성 권한 분리 (어드민 JWT 인증으로 통합, 별도 RBAC 권한 불필요)
- AI slop: 과도한 JSDoc, 막연한 변수명 (data, result, item, temp), 빈 catch 블록

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (테스트 파일 없음)
- **Automated tests**: NO (테스트 미사용)
- **Framework**: none
- **Agent-Executed QA**: 모든 태스크에 QA 시나리오 포함

### QA Policy
- **API/Backend**: Bash (curl) — 엔드포인트 호출, 상태 코드+응답 필드 검증
- **Frontend/UI**: Playwright — 페이지 렌더링, 메뉴 항목, 목록+뷰어 동작
- **Service/Module**: Bash (bun/node REPL 또는 NestJS 앱 직접 실행 후 확인)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, 5 parallel):
├── Task 1: Prisma 스키마 + 마이그레이션 [quick]
├── Task 2: BigQuery 쿼리 7종 정의 [quick]
├── Task 3: 공유 타입 + DTO 정의 [quick]
├── Task 4: NestJS 모듈 스캐폴딩 (stubs) [quick]
└── Task 5: 프론트엔드 API 훅 [quick]

Wave 2 (After Wave 1 — core services, 3 parallel):
├── Task 6: DataCollector 서비스 (BigQuery 7종 쿼리 구현) [unspecified-high]
├── Task 7: QuestionScorer 서비스 (수준있는질문 휴리스틱) [quick]
└── Task 8: ReportBuilder 서비스 (LLM 컨텍스트 빌더 + Gemini 호출) [unspecified-high]

Wave 3 (After Wave 2 — integration, 3 parallel):
├── Task 9: IbkChatReportService 오케스트레이터 [unspecified-high]
├── Task 10: REST API 컨트롤러 [quick]
└── Task 11: 일별 스케줄러 + Slack 알림 [quick]

Wave 4 (After Wave 3 — frontend, 2 parallel):
├── Task 12: 프론트엔드 리포트 목록 페이지 [visual-engineering]
└── Task 13: 프론트엔드 Markdown 뷰어 + 사이드바 메뉴 추가 [visual-engineering]

Wave FINAL (After ALL — 4 parallel):
├── Task F1: Plan Compliance Audit [oracle]
├── Task F2: Code Quality Review [unspecified-high]
├── Task F3: E2E QA (API + Frontend) [unspecified-high]
└── Task F4: Scope Fidelity Check [deep]

Critical Path: T1 → T6 → T9 → T10
Parallel Speedup: ~65% faster than sequential
```

### Agent Dispatch Summary

- **Wave 1**: T1,T2,T3,T4 → `quick`, T5 → `quick`
- **Wave 2**: T6 → `unspecified-high`, T7 → `quick`, T8 → `unspecified-high`
- **Wave 3**: T9 → `unspecified-high`, T10 → `quick`, T11 → `quick`
- **Wave 4**: T12,T13 → `visual-engineering`
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Prisma 스키마 — `IbkChatDailyReport` 모델 추가 및 마이그레이션

  **What to do**:
  - `apps/backend/prisma/schema.prisma`에 다음 모델 추가:
    ```prisma
    model IbkChatDailyReport {
      id             String    @id @default(cuid())
      targetDate     DateTime  @unique  // KST 날짜를 UTC midnight으로 저장 (예: 2026-02-18 → 2026-02-17T15:00:00Z)
      status         String    @default("PENDING") // PENDING | RUNNING | COMPLETED | FAILED | SKIPPED
      reportMarkdown String?   // 전체 Markdown 리포트 본문 (최대 수백KB)
      reportMetadata String?   // JSON 문자열: { totalRequests, successRate, failCount, topQuestionTypes, tokenP99 }
      errorMessage   String?
      durationMs     Int?      // 생성 소요 시간 (ms)
      rowCount       Int?      // 해당 날짜 BigQuery row 수
      createdAt      DateTime  @default(now())
      startedAt      DateTime?
      completedAt    DateTime?
    }
    ```
  - `pnpm --filter backend prisma db push` 실행하여 SQLite에 테이블 생성
  - `pnpm --filter backend prisma generate` 실행하여 Prisma Client 재생성

  **Must NOT do**:
  - 기존 Prisma 모델 수정 금지
  - `@@map` 테이블명 커스터마이징 불필요

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (T1-T5 동시)
  - **Blocks**: T4, T6, T9, T10 (서비스/컨트롤러 모두 이 모델에 의존)
  - **Blocked By**: None

  **References**:
  - `apps/backend/prisma/schema.prisma` — 기존 모델 패턴 (BatchAnalysisJob, BatchAnalysisResult 등) 참조
  - `apps/backend/prisma/seed.ts` — 시드 패턴 참조

  **Acceptance Criteria**:
  - [ ] `prisma validate` 통과
  - [ ] SQLite DB에 `IbkChatDailyReport` 테이블 존재 확인: `sqlite3 prisma/admin.db ".tables"` → `IbkChatDailyReport` 포함
  - [ ] Prisma Client에서 `prisma.ibkChatDailyReport` 접근 가능

  **QA Scenarios**:

  ```
  Scenario: Prisma 스키마 유효성 검증
    Tool: Bash
    Steps:
      1. pnpm --filter backend prisma validate
    Expected Result: "The schema at prisma/schema.prisma is valid"
    Evidence: .sisyphus/evidence/task-1-prisma-validate.txt

  Scenario: SQLite 테이블 생성 확인
    Tool: Bash
    Steps:
      1. sqlite3 apps/backend/prisma/admin.db ".tables" | grep IbkChatDailyReport
    Expected Result: IbkChatDailyReport 테이블명 출력됨
    Evidence: .sisyphus/evidence/task-1-sqlite-tables.txt
  ```

  **Commit**: YES (Wave 1 그룹)
  - Message: `feat(ibk-chat-report): add IbkChatDailyReport prisma model`
  - Files: `apps/backend/prisma/schema.prisma`

- [ ] 2. BigQuery 쿼리 7종 정의 — `apps/backend/src/ibk-chat-report/queries/ibk-chat-report.queries.ts`

  **What to do**:
  - 새 파일 생성: `apps/backend/src/ibk-chat-report/queries/ibk-chat-report.queries.ts`
  - 다음 7개 정적 메서드를 `IbkChatReportQueries` 클래스에 구현:

  **쿼리 1: dailyKPI** — 기본 KPI 집계
  ```sql
  SELECT
    COUNT(*) as total_requests,
    COUNTIF(response_node = 'FINAL') as success_count,
    COUNTIF(response_node != 'FINAL' AND response_node IS NOT NULL) as fail_count,
    ROUND(COUNTIF(response_node = 'FINAL') * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate,
    APPROX_QUANTILES(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64), 100)[OFFSET(50)] as p50_tokens,
    APPROX_QUANTILES(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64), 100)[OFFSET(90)] as p90_tokens,
    APPROX_QUANTILES(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64), 100)[OFFSET(99)] as p99_tokens,
    MAX(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64)) as max_tokens,
    ROUND(AVG(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS FLOAT64)), 2) as avg_tokens
  FROM `{table}`
  WHERE DATE(COALESCE(created_at_utc, timestamp), 'Asia/Seoul') = '{targetDate}'
    AND response_node IS NOT NULL
  ```

  **쿼리 2: questionTypeSuccess** — 질문 유형별 성공률
  ```sql
  SELECT
    COALESCE(question_type, 'UNKNOWN') as question_type,
    COUNT(*) as total,
    COUNTIF(response_node = 'FINAL') as success_count,
    ROUND(COUNTIF(response_node = 'FINAL') * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
  FROM `{table}`
  WHERE DATE(COALESCE(created_at_utc, timestamp), 'Asia/Seoul') = '{targetDate}'
    AND response_node IS NOT NULL
  GROUP BY question_type
  ORDER BY total DESC
  LIMIT 20
  ```

  **쿼리 3: representativeQuestions** — 유형별 대표 질문 샘플 (각 10개)
  ```sql
  WITH ranked AS (
    SELECT
      COALESCE(question_type, 'UNKNOWN') as question_type,
      SUBSTR(user_input, 1, 300) as user_input,
      response_node,
      fail_reason,
      ROW_NUMBER() OVER (PARTITION BY question_type ORDER BY RAND()) as rn
    FROM `{table}`
    WHERE DATE(COALESCE(created_at_utc, timestamp), 'Asia/Seoul') = '{targetDate}'
      AND user_input IS NOT NULL
      AND response_node IS NOT NULL
  )
  SELECT question_type, user_input, response_node, fail_reason
  FROM ranked WHERE rn <= 10
  ORDER BY question_type
  ```

  **쿼리 4: failAnalysis** — fail_reason 집계 + 대표 질문
  ```sql
  SELECT
    COALESCE(fail_reason, response_node) as fail_category,
    response_node,
    COUNT(*) as count,
    ARRAY_AGG(SUBSTR(user_input, 1, 200) ORDER BY RAND() LIMIT 5) as sample_questions
  FROM `{table}`
  WHERE DATE(COALESCE(created_at_utc, timestamp), 'Asia/Seoul') = '{targetDate}'
    AND response_node != 'FINAL'
    AND response_node IS NOT NULL
    AND user_input IS NOT NULL
  GROUP BY fail_category, response_node
  ORDER BY count DESC
  LIMIT 10
  ```

  **쿼리 5: tokenBurstCases** — 토큰 폭증 케이스 Top 20 (>20,000 토큰)
  ```sql
  SELECT
    SUBSTR(user_input, 1, 200) as user_input,
    COALESCE(question_type, 'UNKNOWN') as question_type,
    response_node,
    CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64) as total_tokens,
    CAST(SAFE_CAST(input_tokens AS FLOAT64) AS INT64) as input_tokens,
    CAST(SAFE_CAST(output_tokens AS FLOAT64) AS INT64) as output_tokens
  FROM `{table}`
  WHERE DATE(COALESCE(created_at_utc, timestamp), 'Asia/Seoul') = '{targetDate}'
    AND SAFE_CAST(total_tokens AS FLOAT64) > 20000
    AND user_input IS NOT NULL
  ORDER BY SAFE_CAST(total_tokens AS FLOAT64) DESC
  LIMIT 20
  ```

  **쿼리 6: candidateHighValueQuestions** — 수준있는질문 후보 (전체 raw user_input)
  ```sql
  SELECT
    SUBSTR(user_input, 1, 500) as user_input,
    response_node,
    COALESCE(fail_reason, '') as fail_reason,
    COALESCE(question_type, 'UNKNOWN') as question_type,
    CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64) as total_tokens
  FROM `{table}`
  WHERE DATE(COALESCE(created_at_utc, timestamp), 'Asia/Seoul') = '{targetDate}'
    AND user_input IS NOT NULL
    AND LENGTH(user_input) > 20
    AND response_node IS NOT NULL
  ORDER BY LENGTH(user_input) DESC
  LIMIT 500
  ```

  **쿼리 7: exploratoryClusterSamples** — 탐사용 클러스터링 후보 (OTHER/NULL/미분류)
  ```sql
  SELECT
    SUBSTR(user_input, 1, 300) as user_input,
    response_node,
    COALESCE(question_type, 'UNKNOWN') as question_type
  FROM `{table}`
  WHERE DATE(COALESCE(created_at_utc, timestamp), 'Asia/Seoul') = '{targetDate}'
    AND user_input IS NOT NULL
    AND (question_type IS NULL OR UPPER(question_type) IN ('OTHER', 'OTHERS', 'ETC', '기타'))
    AND response_node IS NOT NULL
  ORDER BY RAND()
  LIMIT 100
  ```

  - 모든 쿼리에서 `{table}` = `${projectId}.${datasetId}.${tableName}` 형식
  - 파라미터: `(projectId: string, datasetId: string, tableName: string, targetDate: string)`

  **Must NOT do**:
  - 개인정보 필드(x_enc_data 등) SELECT 금지 — 이번 쿼리는 IBK-CHAT 필드만
  - `DROP`, `DELETE`, `INSERT` 등 쓰기 쿼리 절대 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (T1-T5 동시)
  - **Blocks**: T6 (DataCollector)
  - **Blocked By**: None

  **References**:
  - `apps/backend/src/metrics/queries/metrics.queries.ts` — BigQuery SQL 패턴 참조 (DATE(timestamp, 'Asia/Seoul'), SAFE_CAST, COALESCE)
  - `apps/backend/src/datasource/implementations/bigquery-metrics.datasource.ts:AGENTS.md` — `success = TRUE` 패턴 주의 (IBK-CHAT은 `response_node = 'FINAL'` 사용)

  **Acceptance Criteria**:
  - [ ] TypeScript 컴파일 오류 없음 (`tsc --noEmit`)
  - [ ] 7개 메서드 모두 존재하고 올바른 SQL string 반환
  - [ ] `{table}` 플레이스홀더 없이 실제 table reference 사용

  **QA Scenarios**:

  ```
  Scenario: 쿼리 생성 함수 존재 확인
    Tool: Bash
    Steps:
      1. grep -c "static" apps/backend/src/ibk-chat-report/queries/ibk-chat-report.queries.ts
    Expected Result: 7 이상 출력
    Evidence: .sisyphus/evidence/task-2-query-count.txt

  Scenario: TypeScript 컴파일 확인
    Tool: Bash
    Steps:
      1. cd apps/backend && npx tsc --noEmit 2>&1 | head -20
    Expected Result: 에러 없음 (빈 출력 또는 0 errors)
    Evidence: .sisyphus/evidence/task-2-tsc.txt
  ```

  **Commit**: YES (Wave 1 그룹)

- [ ] 3. 공유 타입 + DTO 정의 — interfaces, DTOs

  **What to do**:
  - `apps/backend/src/ibk-chat-report/interfaces/ibk-chat-report.interface.ts` 생성:
    ```typescript
    export type ReportStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

    export interface DailyKPI {
      totalRequests: number;
      successCount: number;
      failCount: number;
      successRate: number;
      p50Tokens: number;
      p90Tokens: number;
      p99Tokens: number;
      maxTokens: number;
      avgTokens: number;
    }

    export interface QuestionTypeRow {
      questionType: string;
      total: number;
      successCount: number;
      successRate: number;
    }

    export interface RepresentativeQuestion {
      questionType: string;
      userInput: string;
      responseNode: string;
      failReason: string | null;
    }

    export interface FailAnalysisRow {
      failCategory: string;
      responseNode: string;
      count: number;
      sampleQuestions: string[];
    }

    export interface TokenBurstCase {
      userInput: string;
      questionType: string;
      responseNode: string;
      totalTokens: number;
      inputTokens: number;
      outputTokens: number;
    }

    export interface CandidateQuestion {
      userInput: string;
      responseNode: string;
      failReason: string;
      questionType: string;
      totalTokens: number;
    }

    export interface ScoredQuestion extends CandidateQuestion {
      score: number; // 0-10
      tags: string[]; // ['기간', '비교', '근거', '리스크', '산출물']
    }

    export interface CollectedReportData {
      targetDate: string;
      kpi: DailyKPI;
      questionTypeStats: QuestionTypeRow[];
      representativeQuestions: RepresentativeQuestion[];
      failAnalysis: FailAnalysisRow[];
      tokenBurstCases: TokenBurstCase[];
      highValueQuestions: ScoredQuestion[]; // Top30
      exploratoryClusterSamples: CandidateQuestion[];
    }
    ```
  - `apps/backend/src/ibk-chat-report/dto/generate-report.dto.ts` 생성:
    ```typescript
    import { IsDateString, IsOptional, IsBoolean } from 'class-validator';
    export class GenerateReportDto {
      @IsDateString() targetDate: string; // 'YYYY-MM-DD'
      @IsOptional() @IsBoolean() force?: boolean; // true: 기존 리포트 덮어쓰기
    }
    ```
  - `apps/backend/src/ibk-chat-report/dto/list-reports.dto.ts` 생성:
    ```typescript
    import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
    import { Transform } from 'class-transformer';
    export class ListReportsDto {
      @IsOptional() @IsString() startDate?: string;
      @IsOptional() @IsString() endDate?: string;
      @IsOptional() @IsString() status?: string;
      @IsOptional() @Transform(({value}) => parseInt(value)) @IsInt() @Min(1) @Max(100) limit?: number;
      @IsOptional() @Transform(({value}) => parseInt(value)) @IsInt() @Min(0) offset?: number;
    }
    ```

  **Must NOT do**:
  - `@ola/shared-types` 수정 불필요 (백엔드 전용 타입)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (T1-T5 동시)
  - **Blocks**: T6, T7, T8, T9, T10
  - **Blocked By**: None

  **References**:
  - `apps/backend/src/batch-analysis/interfaces/batch-analysis.interface.ts` — 인터페이스 패턴
  - `apps/backend/src/batch-analysis/dto/create-job.dto.ts` — DTO 패턴

  **Acceptance Criteria**:
  - [ ] TypeScript 컴파일 오류 없음
  - [ ] `ReportStatus` union type 5개 값 모두 포함
  - [ ] `ScoredQuestion`이 `CandidateQuestion` 확장

  **QA Scenarios**:

  ```
  Scenario: 타입 정의 완전성 확인
    Tool: Bash
    Steps:
      1. grep -c "export interface\|export type" apps/backend/src/ibk-chat-report/interfaces/ibk-chat-report.interface.ts
    Expected Result: 9 이상 출력 (8개 interface + 1개 type)
    Evidence: .sisyphus/evidence/task-3-types.txt
  ```

  **Commit**: YES (Wave 1 그룹)

- [ ] 4. NestJS 모듈 스캐폴딩 — 빈 스텁 + app.module.ts 등록

  **What to do**:
  - `apps/backend/src/ibk-chat-report/ibk-chat-report.module.ts` 생성:
    ```typescript
    @Module({
      imports: [ConfigModule, DatabaseModule, LLMModule, NotificationsModule],
      // ⚠️ ScheduleModule은 app.module.ts에서 ScheduleModule.forRoot()로 전역 등록됨 → 재import 금지
      controllers: [IbkChatReportController],
      providers: [
        IbkChatReportService,
        IbkChatReportScheduler,
        DataCollectorService,
        QuestionScorerService,
        ReportBuilderService,
      ],
    })
    export class IbkChatReportModule {}
    ```
  - 각 파일을 빈 스텁으로 생성 (constructor, logger만):
    - `ibk-chat-report.service.ts` — `@Injectable()`, 메서드 스텁
    - `ibk-chat-report.controller.ts` — `@Controller()`, 엔드포인트 스텁
    - `ibk-chat-report.scheduler.ts` — `@Injectable()`, onModuleInit 스텁
    - `services/data-collector.service.ts` — 스텁
    - `services/question-scorer.service.ts` — 스텁
    - `services/report-builder.service.ts` — 스텁
    - `index.ts` — barrel export
  - `apps/backend/src/app.module.ts`에 `IbkChatReportModule` import 추가

  **Must NOT do**:
  - 실제 비즈니스 로직 구현 금지 (스텁만)
  - 기존 app.module.ts의 다른 import 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (T1-T5 동시)
  - **Blocks**: T6, T7, T8, T9, T10, T11
  - **Blocked By**: None

  **References**:
  - `apps/backend/src/batch-analysis/batch-analysis.module.ts` — 모듈 패턴
  - `apps/backend/src/app.module.ts` — 기존 import 목록 (추가 위치 확인)

  **Acceptance Criteria**:
  - [ ] `pnpm dev:backend` 실행 시 컴파일 에러 없음
  - [ ] `IbkChatReportModule` 로그 메시지 출력 확인

  **QA Scenarios**:

  ```
  Scenario: 모듈 로드 확인
    Tool: Bash
    Steps:
      1. cd apps/backend && pnpm start:dev 2>&1 | head -30 | grep -i "ibk"
    Expected Result: IbkChatReport 관련 모듈 초기화 로그 출력 (또는 에러 없음)
    Evidence: .sisyphus/evidence/task-4-module-load.txt
  ```

  **Commit**: YES (Wave 1 그룹)

- [ ] 5. 프론트엔드 API 훅 — `use-ibk-chat-report.ts`

  **What to do**:
  - `apps/frontend-next/src/hooks/queries/use-ibk-chat-report.ts` 생성:
    ```typescript
    // 리포트 목록 조회 훅
    export function useIbkChatReports(params?: { startDate?: string; endDate?: string; status?: string; limit?: number })

    // 특정 날짜 리포트 조회 훅
    export function useIbkChatReport(date: string | null)

    // 수동 생성 뮤테이션 훅
    export function useGenerateIbkChatReport()
    ```
  - API prefix: `/projects/ibks/api/ibk-chat-report` (기존 service-mapping.ts의 `ibk-chat` → `apiPrefix: '/projects/ibks/api'` 패턴 따름)
  - 응답 타입 (인라인 정의):
    ```typescript
    interface IbkChatReportSummary {
      id: string;
      targetDate: string;
      status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
      rowCount: number | null;
      durationMs: number | null;
      createdAt: string;
      completedAt: string | null;
    }
    interface IbkChatReportDetail extends IbkChatReportSummary {
      reportMarkdown: string | null;
      reportMetadata: string | null; // JSON string
      errorMessage: string | null;
    }
    ```
  - TanStack Query v5 사용 (기존 `useQuery`, `useMutation` 패턴)

  **Must NOT do**:
  - 기존 훅 파일 수정 금지
  - 전역 상태(Zustand)에 리포트 데이터 저장 불필요

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (T1-T5 동시)
  - **Blocks**: T12, T13
  - **Blocked By**: None

  **References**:
  - `apps/frontend-next/src/hooks/queries/` — 기존 훅 파일 패턴 참조
  - `apps/frontend-next/src/config/service-mapping.ts` — API prefix 확인

  **Acceptance Criteria**:
  - [ ] TypeScript 컴파일 오류 없음 (프론트엔드)
  - [ ] `useIbkChatReports`, `useIbkChatReport`, `useGenerateIbkChatReport` 3개 훅 export

  **QA Scenarios**:

  ```
  Scenario: 훅 export 확인
    Tool: Bash
    Steps:
      1. grep -c "^export function use" apps/frontend-next/src/hooks/queries/use-ibk-chat-report.ts
    Expected Result: 3 출력
    Evidence: .sisyphus/evidence/task-5-hooks.txt
  ```

  **Commit**: YES (Wave 1 그룹)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] 6. DataCollector 서비스 — BigQuery 7종 쿼리 실행 및 데이터 수집

  **What to do**:
  - `apps/backend/src/ibk-chat-report/services/data-collector.service.ts` 구현
  - BigQuery 클라이언트 초기화 (기존 `batch-analysis.service.ts` 패턴 참조)
  - 7개 메서드 구현:
    - `fetchDailyKPI(targetDate: string): Promise<DailyKPI>`
    - `fetchQuestionTypeStats(targetDate: string): Promise<QuestionTypeRow[]>`
    - `fetchRepresentativeQuestions(targetDate: string): Promise<RepresentativeQuestion[]>`
    - `fetchFailAnalysis(targetDate: string): Promise<FailAnalysisRow[]>`
    - `fetchTokenBurstCases(targetDate: string): Promise<TokenBurstCase[]>`
    - `fetchCandidateQuestions(targetDate: string): Promise<CandidateQuestion[]>`
    - `fetchExploratoryClusterSamples(targetDate: string): Promise<CandidateQuestion[]>`
  - `collectAll(targetDate: string): Promise<CollectedReportData>` 메서드: 7개 쿼리 `Promise.all` 병렬 실행
  - `getTotalRowCount(targetDate: string): Promise<number>` — 총 건수 조회 (최소 임계값 확인용)
  - BigQuery 설정: `ConfigService`에서 GCP_PROJECT_ID, BIGQUERY_DATASET, BIGQUERY_TABLE, GCP_BQ_LOCATION 읽기
  - 에러 시 빈 배열/기본값 반환 (개별 쿼리 실패가 전체를 막지 않도록)

  **Must NOT do**:
  - raw user_input을 전체 text로 LLM에 직접 전달 금지 (SUBSTR 350자 제한 쿼리에서 이미 처리)
  - PII 필드(x_enc_data) 수집 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 없음
    - `Reason`: BigQuery 클라이언트 패턴, Promise.all, 에러 핸들링, 7개 쿼리 올바른 결과 타입 매핑 등 복잡한 구현

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (T6-T8 동시)
  - **Blocks**: T9 (오케스트레이터)
  - **Blocked By**: T1 (타입), T2 (쿼리), T3 (인터페이스), T4 (모듈)

  **References**:
  - `apps/backend/src/batch-analysis/batch-analysis.service.ts:92-107` — BigQuery 클라이언트 초기화 패턴
  - `apps/backend/src/batch-analysis/batch-analysis.service.ts:774-810` — fetchChatSamples() 패턴 (같은 BigQuery 클라이언트 구조)
  - `apps/backend/src/ibk-chat-report/queries/ibk-chat-report.queries.ts` — T2에서 생성된 쿼리 메서드
  - `apps/backend/src/ibk-chat-report/interfaces/ibk-chat-report.interface.ts` — T3에서 생성된 타입
  - `apps/backend/src/metrics/queries/metrics.queries.ts:AGENTS.md` — SAFE_CAST, COALESCE 패턴

  **Acceptance Criteria**:
  - [ ] TypeScript 컴파일 오류 없음
  - [ ] `collectAll()` 메서드 존재, `CollectedReportData` 반환 타입 명시
  - [ ] 각 쿼리 실패 시 에러 로그 + 빈 배열 반환 (throw 하지 않음)

  **QA Scenarios**:

  ```
  Scenario: 서비스 주입 및 메서드 시그니처 확인
    Tool: Bash
    Steps:
      1. grep -c "async fetch\|async collect\|async getTotal" apps/backend/src/ibk-chat-report/services/data-collector.service.ts
    Expected Result: 9 이상 (7개 fetch + collectAll + getTotalRowCount)
    Evidence: .sisyphus/evidence/task-6-methods.txt

  Scenario: 에러 핸들링 패턴 확인
    Tool: Bash
    Steps:
      1. grep -c "catch" apps/backend/src/ibk-chat-report/services/data-collector.service.ts
    Expected Result: 3 이상 (개별 쿼리마다 try/catch)
    Evidence: .sisyphus/evidence/task-6-error-handling.txt
  ```

  **Commit**: YES (Wave 2 그룹)

- [ ] 7. QuestionScorer 서비스 — 수준있는질문 휴리스틱 점수화

  **What to do**:
  - `apps/backend/src/ibk-chat-report/services/question-scorer.service.ts` 구현
  - 점수 기준 (0~10점):
    ```typescript
    const SCORING_CRITERIA = {
      기간: ['~까지', '~이후', '~동안', '~전', '기간', '추이', '변화', '흐름', '최근', '작년', '전년', '분기', '월별', '연간'],
      비교: ['대비', '비교', 'vs', '차이', '높은', '낮은', '많은', '적은', '초과', '미만', '상위', '하위', '순위'],
      근거: ['이유', '원인', '왜', '근거', '기준', '어떻게', '어떤 이유', '배경', '원리'],
      리스크: ['위험', '손실', '리스크', '변동성', '하락', '손해', '방어', '헤지', '최악', '불안'],
      산출물: ['계산', '수익률', '금액', '예상', '추정', '구해', '알려줘', '얼마', '몇 %', '환산', '환율'],
    };
    ```
  - 점수 계산: 각 기준 매칭 시 +2점, 최대 10점
  - 최소 2개 기준 충족 시 "수준있는질문"으로 분류 (태그 추가)
  - 메서드:
    - `scoreQuestion(q: CandidateQuestion): ScoredQuestion` — 단건 점수화
    - `scoreAll(questions: CandidateQuestion[]): ScoredQuestion[]` — 전체 점수화
    - `getTop30(questions: CandidateQuestion[]): ScoredQuestion[]` — 점수 상위 30개 반환
  - 점수가 동점이면 `total_tokens` 높은 순 정렬 (더 복잡한 질문 우선)

  **Must NOT do**:
  - LLM 호출 금지 (휴리스틱만)
  - 외부 의존성 추가 금지 (순수 TypeScript 유틸리티)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (T6-T8 동시)
  - **Blocks**: T9 (오케스트레이터)
  - **Blocked By**: T3 (인터페이스 타입), T4 (모듈 스텁)

  **References**:
  - `apps/backend/src/ibk-chat-report/interfaces/ibk-chat-report.interface.ts` — `CandidateQuestion`, `ScoredQuestion` 타입

  **Acceptance Criteria**:
  - [ ] `SCORING_CRITERIA` 5개 기준, 각 14개 이상 키워드
  - [ ] `getTop30()` 결과 ≤ 30개, 모두 `tags.length >= 2` 충족
  - [ ] 점수 범위 0-10 보장

  **QA Scenarios**:

  ```
  Scenario: 점수화 로직 단위 확인 (node REPL)
    Tool: Bash
    Steps:
      1. node -e "
        const { QuestionScorerService } = require('./apps/backend/dist/ibk-chat-report/services/question-scorer.service');
        const svc = new QuestionScorerService();
        const q = { userInput: 'ETF 수익률을 작년 대비 비교해서 리스크 계산해줘', responseNode: 'FINAL', failReason: '', questionType: 'FUND', totalTokens: 5000 };
        const scored = svc.scoreQuestion(q);
        console.log(scored.score, scored.tags.join(','));
      "
    Expected Result: score >= 6, tags에 '비교','리스크','산출물' 포함
    Evidence: .sisyphus/evidence/task-7-scorer.txt

  Scenario: getTop30 최대 건수 확인
    Tool: Bash
    Steps:
      1. grep -A5 "getTop30" apps/backend/src/ibk-chat-report/services/question-scorer.service.ts | grep "slice\|limit\|30"
    Expected Result: Top30 제한 코드 존재
    Evidence: .sisyphus/evidence/task-7-top30.txt
  ```

  **Commit**: YES (Wave 2 그룹)

- [ ] 8. ReportBuilder 서비스 — LLM 컨텍스트 빌더 + Gemini 단일 호출

  **What to do**:
  - `apps/backend/src/ibk-chat-report/services/report-builder.service.ts` 구현
  - `LLMService` 주입 (기존 `admin/analysis/llm/llm.service.ts`)
  - `buildContext(data: CollectedReportData): string` — Markdown 형식 컨텍스트 문서 생성:
    ```
    # IBK-CHAT 일일 데이터 요약 (대상 날짜: {targetDate})
    
    ## 1. KPI 집계
    - 총 요청: {totalRequests}건, 성공(FINAL): {successCount}건 ({successRate}%)
    - 실패: {failCount}건 (AMBIGUOUS/UNSUPPORTED/SAFETY/ETN 포함)
    - 토큰 통계: P50={p50}, P90={p90}, P99={p99}, Max={maxTokens}
    
    ## 2. 질문 유형별 성공률
    | 질문유형 | 건수 | 성공률 |
    |---------|------|--------|
    ...각 question_type별 행...
    
    ## 3. 유형별 대표 질문 샘플 (각 최대 10개)
    ...각 유형별 질문 목록...
    
    ## 4. 실패 원인 분석 (Top10)
    ...fail_reason별 건수 + 대표질문 5개...
    
    ## 5. 토큰 폭증 케이스 (>20,000 토큰, Top20)
    ...사례 목록...
    
    ## 6. 수준있는질문 후보 Top30 (휴리스틱 점수 기준)
    ...질문, 점수, 태그, response_node, fail_reason...
    
    ## 7. 탐사용 클러스터링 샘플 (OTHER/미분류, 최대 100개)
    ...질문 목록...
    ```
  - `generateReport(data: CollectedReportData): Promise<string>` — LLM 호출로 Markdown 리포트 생성:
    - system prompt (사용자 제공 프롬프트 + 섹션 A-G 출력 지시)
    - user message: buildContext() 결과
    - `max_tokens`: 8192 (Gemini 설정 시)
    - 한국어, 존댓말, Markdown 형식 강제
  - system prompt 상수 (파일 내 `IBKCHAT_REPORT_SYSTEM_PROMPT`):
    ```
    당신은 금융 챗봇 로그를 분석하는 데이터 분석가입니다. 주어지는 하루치 로그 집계 데이터를 기반으로 일일 리포트를 작성합니다.
    
    핵심 목표: 1) 챗봇 품질 향상에 직접 연결되는 인사이트와 액션 아이템 도출 2) 잘 답변하는 질문 유형 및 대표 질문 리스트 추출 3) 답변 성공 여부와 무관하게 수준 있는 질문(영양가 있는 질문) 추출 4) 클러스터링 결과 포함
    
    제약: 입력 데이터에 없는 사실을 추정하거나 만들어내지 않습니다. 출력은 한국어(존댓말)로 작성합니다.
    
    반드시 다음 섹션을 포함하여 Markdown으로 작성하세요:
    A. 챗봇이 잘 답변하는 질문 유형 (성공률 표 + 대표질문 10개/유형 + 답변 포맷 특징)
    B. 수준있는질문 Top30 (점수+태그+실패시 response_node+fail_reason+한줄코멘트)
       선정기준: 기간/비교/근거/리스크/산출물 중 2개 이상 충족
    C. 실패 원인 Top10 + 유형별 대표질문 5개 + 개선 액션
    D. 토큰 P50/P90/P99/Max + 폭증 케이스(>20k) Top20 + 완화책
    E. 클러스터링: 고정클러스터 Top10 표(question_type 기준) + 탐사용 신규 트렌드 클러스터 3개(대표질문5개+2줄요약+운영라벨편입제안)
    F. 추천 질문 프롬프트 20개 (잘답변10개+수준있는10개, 사용자가 그대로 쓸 수 있는 문장)
    G. 내일 액션 아이템 Top5 (기대효과+우선순위)
    
    표준 용어: 성공=response_node가 FINAL인 경우, 실패=AMBIGUOUS/UNSUPPORTED/SAFETY/ETN
    ```

  **Must NOT do**:
  - LLM 여러 번 호출 금지 (단일 Gemini 호출)
  - buildContext()에서 500자 초과 user_input 포함 금지 (이미 쿼리에서 SUBSTR 처리됨)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 없음
    - `Reason`: LLM 프롬프트 엔지니어링, 대용량 컨텍스트 구성, Markdown 생성 검증 복잡

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (T6-T8 동시)
  - **Blocks**: T9 (오케스트레이터)
  - **Blocked By**: T3 (인터페이스), T4 (모듈)

  **References**:
  - `apps/backend/src/batch-analysis/batch-analysis.service.ts:850-916` — LLM 호출 패턴 (`analyzeBatch`)
  - `apps/backend/src/admin/analysis/llm/llm.service.ts` — `generateAnalysis([{role, content}])` API
  - `apps/backend/src/ibk-chat-report/interfaces/ibk-chat-report.interface.ts` — `CollectedReportData` 타입

  **Acceptance Criteria**:
  - [ ] `IBKCHAT_REPORT_SYSTEM_PROMPT` 상수에 섹션 A-G 출력 지시 포함
  - [ ] `buildContext()` 7개 섹션 포함 (KPI, 유형별 성공률, 대표질문, 실패분석, 토큰폭증, Top30, 탐사샘플)
  - [ ] `generateReport()` LLM 호출 1회, `llmService.generateAnalysis()` 반환값의 `response.content`가 비어있지 않은 string

  **QA Scenarios**:

  ```
  Scenario: SYSTEM_PROMPT에 섹션 A-G 포함 확인
    Tool: Bash
    Steps:
      1. grep -c "^A\.\|^B\.\|^C\.\|^D\.\|^E\.\|^F\.\|^G\." apps/backend/src/ibk-chat-report/services/report-builder.service.ts
    Expected Result: 7 이상
    Evidence: .sisyphus/evidence/task-8-sections.txt

  Scenario: buildContext 메서드 존재 확인
    Tool: Bash
    Steps:
      1. grep "buildContext\|generateReport" apps/backend/src/ibk-chat-report/services/report-builder.service.ts | wc -l
    Expected Result: 4 이상 (선언+호출)
    Evidence: .sisyphus/evidence/task-8-methods.txt
  ```

  **Commit**: YES (Wave 2 그룹)

- [ ] 9. IbkChatReportService 오케스트레이터 — 리포트 생성 파이프라인

  **What to do**:
  - `apps/backend/src/ibk-chat-report/ibk-chat-report.service.ts` 구현
  - 핵심 메서드: `generateDailyReport(targetDate: string, force?: boolean): Promise<void>`
    ```
    1. 동시 실행 방지: DB에서 해당 날짜 RUNNING 상태 확인 → 존재하면 ConflictException
    2. force=true + 기존 레코드 있으면: 기존 삭제 후 재생성
    3. 새 레코드 생성 (status: RUNNING, startedAt: now())
    4. getTotalRowCount() 조회 → 50건 미만이면 status=SKIPPED, 종료
    5. collectAll() 병렬 쿼리 실행
    6. questionScorer.getTop30() 수준있는질문 Top30 추출
    7. reportBuilder.generateReport() LLM 호출
    8. reportMetadata JSON 구성 (KPI 요약, topQuestionTypes, tokenP99)
    9. DB 업데이트: status=COMPLETED, reportMarkdown, reportMetadata, completedAt, durationMs
    10. Slack 알림: 완료
    ```
  - 에러 시: status=FAILED, errorMessage 저장, Slack 알림(critical)
  - 추가 메서드:
    - `listReports(dto: ListReportsDto): Promise<{reports: IbkChatReportSummary[], total: number}>`
    - `getReport(date: string): Promise<IbkChatReportDetail>` — 날짜 기반 조회
    - `deleteReport(id: string): Promise<void>`
  - `onModuleInit()`: RUNNING 상태인 리포트 모두 → FAILED 리셋 (서버 재시작 안전장치)

  **Must NOT do**:
  - 직접 BigQuery 쿼리 실행 금지 (DataCollectorService에 위임)
  - 직접 LLM 호출 금지 (ReportBuilderService에 위임)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (T9-T11 중 T9 먼저 시작, 단 T10과 T11은 T9와 독립)
  - **Blocks**: T10 (컨트롤러가 이 서비스 주입)
  - **Blocked By**: T1(Prisma), T6(DataCollector), T7(QuestionScorer), T8(ReportBuilder)

  **References**:
  - `apps/backend/src/batch-analysis/batch-analysis.service.ts:457-500` — `runJob()` 패턴 (상태 관리, 비동기 실행)
  - `apps/backend/src/batch-analysis/batch-analysis.service.ts:565-769` — `executeJobAsync()` 전체 파이프라인 패턴
  - `apps/backend/src/ibk-chat-report/services/` — T6, T7, T8 서비스
  - `apps/backend/src/notifications/slack-notification.service.ts` — Slack 알림 패턴

  **Acceptance Criteria**:
  - [ ] RUNNING 상태 중복 생성 시 ConflictException 발생
  - [ ] 50건 미만이면 SKIPPED 상태로 저장
  - [ ] 서버 재시작 시 RUNNING → FAILED 리셋 (`onModuleInit`)
  - [ ] `durationMs` 저장 (startedAt ~ completedAt 계산)

  **QA Scenarios**:

  ```
  Scenario: 동시 실행 방지 확인
    Tool: Bash (curl)
    Preconditions: 백엔드 실행 중, 특정 날짜 리포트가 RUNNING 상태로 DB에 존재
    Steps:
      1. curl -X POST http://localhost:3000/projects/ibks/api/ibk-chat-report/generate \
           -H "Authorization: Bearer {JWT}" \
           -d '{"targetDate": "2026-02-18"}'
    Expected Result: HTTP 409 Conflict 반환
    Evidence: .sisyphus/evidence/task-9-conflict.txt

  Scenario: force 재생성 확인
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://localhost:3000/projects/ibks/api/ibk-chat-report/generate \
           -H "Authorization: Bearer {JWT}" \
           -d '{"targetDate": "2026-02-18", "force": true}'
    Expected Result: HTTP 202 반환, 기존 레코드 덮어쓰기
    Evidence: .sisyphus/evidence/task-9-force.txt
  ```

  **Commit**: YES (Wave 3 그룹)

- [ ] 10. REST API 컨트롤러 — 5개 엔드포인트

  **What to do**:
  - `apps/backend/src/ibk-chat-report/ibk-chat-report.controller.ts` 구현
  - 경로 prefix: `@Controller('projects/ibks/api/ibk-chat-report')` — 명시적으로 전체 경로 사용
    - ⚠️ `main.ts`에 `setGlobalPrefix()` 없음, `app.module.ts`에도 전역 prefix 없음
    - `batch-analysis.controller.ts`는 `@Controller('api/admin/batch-analysis')` 패턴으로 전체 경로 직접 선언
    - 따라서 이 컨트롤러도 동일하게 `@Controller('projects/ibks/api/ibk-chat-report')` 사용
  - **5개 엔드포인트**:
    ```
    GET    /ibk-chat-report           → listReports(dto: ListReportsDto)
    POST   /ibk-chat-report/generate  → 수동 생성 트리거 (비동기, 202 반환)
    GET    /ibk-chat-report/:date     → getReport(date: string) (YYYY-MM-DD 형식)
    DELETE /ibk-chat-report/:id       → deleteReport(id: string)
    GET    /ibk-chat-report/stats     → 간단한 통계 (총 리포트 수, 상태별 건수)
    ```
  - 인증: JWT 전역 가드 적용 (기존 `JwtAuthGuard` — `@Public()` 없이 기본 보호)
  - `POST /generate` 응답: `{ status: 'RUNNING', message: '...' }` (비동기 생성, 폴링용)
  - `GET /:date` 응답: `IbkChatReportDetail` (reportMarkdown 포함)
  - `GET /` 응답: `{ reports: IbkChatReportSummary[], total: number }` (reportMarkdown 제외)
  - Swagger `@ApiTags('ibk-chat-report')` + 각 엔드포인트 `@ApiOperation` 추가

  **Must NOT do**:
  - 리포트 생성을 동기적으로 처리 금지 (POST /generate는 202 즉시 반환)
  - `reportMarkdown` 목록 API에 포함 금지 (성능 이슈)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (T9-T11 병렬)
  - **Blocks**: T12 (프론트엔드)
  - **Blocked By**: T9 (IbkChatReportService)

  **References**:
  - `apps/backend/src/batch-analysis/batch-analysis.controller.ts` — 컨트롤러 패턴
  - `apps/backend/src/metrics/metrics.controller.ts` — Swagger 패턴

  **Acceptance Criteria**:
  - [ ] 5개 엔드포인트 존재
  - [ ] POST /generate → HTTP 202 반환
  - [ ] GET /:date 응답에 `reportMarkdown` 포함
  - [ ] GET / 응답에 `reportMarkdown` 미포함

  **QA Scenarios**:

  ```
  Scenario: 목록 API 호출
    Tool: Bash (curl)
    Preconditions: 백엔드 실행 중, JWT 발급됨
    Steps:
      1. curl http://localhost:3000/projects/ibks/api/ibk-chat-report \
           -H "Authorization: Bearer {JWT}"
    Expected Result: HTTP 200, { "reports": [...], "total": N }. reports 항목에 reportMarkdown 없음
    Evidence: .sisyphus/evidence/task-10-list.txt

  Scenario: 수동 생성 트리거
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://localhost:3000/projects/ibks/api/ibk-chat-report/generate \
           -H "Authorization: Bearer {JWT}" \
           -H "Content-Type: application/json" \
           -d '{"targetDate": "2026-02-17"}'
    Expected Result: HTTP 202, { "status": "RUNNING" }
    Evidence: .sisyphus/evidence/task-10-generate.txt
  ```

  **Commit**: YES (Wave 3 그룹)

- [ ] 11. 일별 스케줄러 + Slack 알림

  **What to do**:
  - `apps/backend/src/ibk-chat-report/ibk-chat-report.scheduler.ts` 구현
  - 매일 02:00 KST 고정 cron (DB 설정 불필요, 하드코딩):
    ```typescript
    @Cron('0 2 * * *', { timeZone: 'Asia/Seoul' })
    async runDailyReport() {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const targetDate = format(yesterday, 'yyyy-MM-dd'); // date-fns 또는 직접 포맷
      this.logger.log(`Running daily IBK-CHAT report for ${targetDate}`);
      await this.ibkChatReportService.generateDailyReport(targetDate, false);
    }
    ```
  - `onModuleInit()`에서 기존 RUNNING 리포트 FAILED 리셋 호출 (IbkChatReportService에 위임)
  - 스케줄러 실패 시 Slack `critical` 알림 (SlackNotificationService 재사용)
  - 완료 시 Slack `info` 알림: 날짜, 총 건수, 성공률, 생성 소요시간

  **Must NOT do**:
  - `@nestjs/schedule`의 동적 스케줄러 불필요 (배치분석과 달리 단일 고정 스케줄)
  - 스케줄 설정을 DB에 저장 불필요

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (T9-T11 병렬)
  - **Blocks**: FINAL verification
  - **Blocked By**: T9 (IbkChatReportService)

  **References**:
  - `apps/backend/src/batch-analysis/batch-analysis.scheduler.ts` — `@Cron`, `CronJob`, `timeZone` 패턴
  - `apps/backend/src/notifications/slack-notification.service.ts` — `sendAlert()` 패턴

  **Acceptance Criteria**:
  - [ ] `@Cron('0 2 * * *', { timeZone: 'Asia/Seoul' })` 데코레이터 존재
  - [ ] 스케줄러 등록 로그 서버 시작 시 출력

  **QA Scenarios**:

  ```
  Scenario: 스케줄러 등록 확인
    Tool: Bash
    Steps:
      1. cd apps/backend && pnpm start:dev 2>&1 | grep -i "ibk.*report.*scheduler\|cron.*02"
    Expected Result: 스케줄러 등록 로그 출력
    Evidence: .sisyphus/evidence/task-11-scheduler.txt

  Scenario: Slack 알림 코드 존재 확인
    Tool: Bash
    Steps:
      1. grep -c "sendAlert\|slackNotification" apps/backend/src/ibk-chat-report/ibk-chat-report.scheduler.ts
    Expected Result: 2 이상
    Evidence: .sisyphus/evidence/task-11-slack.txt
  ```

  **Commit**: YES (Wave 3 그룹)

- [ ] 12. 프론트엔드 리포트 목록 페이지

  **What to do**:
  - 디렉토리: `apps/frontend-next/src/app/dashboard/services/[serviceId]/daily-report/page.tsx`
    - Next.js App Router 실제 구조: `app/dashboard/services/[serviceId]/` (ibks/ 디렉토리 없음)
    - serviceId가 `ibk-chat`일 때 URL: `/dashboard/services/ibk-chat/daily-report`
  - **UI 구성**:
    - 페이지 헤더: "IBK-CHAT 일일 리포트"
    - 날짜 범위 필터 (startDate, endDate 날짜 입력)
    - 상태 필터 드롭다운 (ALL / COMPLETED / FAILED / SKIPPED)
    - 수동 생성 버튼 (날짜 선택 후 생성 트리거, 폴링으로 상태 갱신)
    - 리포트 목록 테이블/카드:
      | 날짜 | 상태 | 총 건수 | 소요시간 | 생성일 | 액션 |
      |------|------|---------|---------|--------|------|
      각 행 클릭 → `/dashboard/services/ibk-chat/daily-report/[date]` 이동
    - 상태별 배지 색상: COMPLETED=green, RUNNING=blue(애니메이션), FAILED=red, SKIPPED=gray, PENDING=yellow
  - `useIbkChatReports()` 훅 사용 (T5에서 생성)
  - 생성 버튼 클릭 시 `useGenerateIbkChatReport()` 뮤테이션 → 성공 시 refetch
  - 반응형: 모바일에서 카드형, 데스크탑에서 테이블형
  - 다크 테마 (`bg-slate-800`, 기존 대시보드 색상 팔레트 준수)

  **Must NOT do**:
  - 기존 페이지 수정 금지
  - 자체 fetch 로직 구현 금지 (훅 사용)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (T12-T13 동시)
  - **Blocks**: F3 (E2E QA)
  - **Blocked By**: T5 (API 훅), T10 (API 엔드포인트 스펙)

  **References**:
  - `apps/frontend-next/src/app/dashboard/services/[serviceId]/` — 실제 App Router 구조 (ibks/ 없음)
  - `apps/frontend-next/src/app/dashboard/services/[serviceId]/batch-analysis/page.tsx` — 레이아웃 패턴 참조 (이 파일이 ibk-chat 배치분석 페이지의 실제 경로)
  - `apps/frontend-next/src/app/dashboard/services/[serviceId]/layout.tsx` — 공통 레이아웃 (사이드바 포함)
  - `apps/frontend-next/src/hooks/queries/use-ibk-chat-report.ts` — T5에서 생성된 훅

  **Acceptance Criteria**:
  - [ ] `/dashboard/services/ibk-chat/daily-report` URL 접근 가능 (404 없음)
  - [ ] 리포트 목록 렌더링 (empty state 포함)
  - [ ] 수동 생성 버튼 존재, 클릭 시 API 호출

  **QA Scenarios**:

  ```
  Scenario: 페이지 로드 확인
    Tool: Playwright
    Steps:
      1. page.goto('http://localhost:3001/dashboard/services/ibk-chat/daily-report')
      2. page.waitForSelector('h1, h2')
    Expected Result: "일일 리포트" 또는 "IBK-CHAT" 텍스트 포함 헤더 렌더링
    Failure Indicators: 404 페이지, 빈 화면
    Evidence: .sisyphus/evidence/task-12-page-load.png

  Scenario: 수동 생성 버튼 존재 확인
    Tool: Playwright
    Steps:
      1. page.goto('http://localhost:3001/dashboard/services/ibk-chat/daily-report')
      2. page.locator('button:has-text("생성"), button:has-text("리포트 생성")').first().isVisible()
    Expected Result: true
    Evidence: .sisyphus/evidence/task-12-generate-btn.png
  ```

  **Commit**: YES (Wave 4 그룹)

- [ ] 13. 프론트엔드 Markdown 뷰어 + 사이드바 메뉴 추가

  **What to do**:
  - **리포트 상세 뷰어 페이지**: `apps/frontend-next/src/app/dashboard/services/[serviceId]/daily-report/[date]/page.tsx`
    - URL: `/dashboard/services/ibk-chat/daily-report/2026-02-17`
    - URL 파라미터: `date` (YYYY-MM-DD)
    - `useIbkChatReport(date)` 훅으로 데이터 로드
    - Markdown 렌더링: `react-markdown` + `remark-gfm` (기존 패키지 확인, 없으면 설치)
    - 섹션 이동 가능한 목차 (A-G 앵커 링크)
    - 상단 메타정보: 날짜, 상태, 총 건수, 생성 시간, 소요시간
    - "← 목록으로" 뒤로가기 버튼
    - RUNNING 상태: 폴링(5초) + 로딩 스피너
    - FAILED 상태: 에러 메시지 + 재생성 버튼
    - SKIPPED 상태: "해당 날짜 데이터 부족 (50건 미만)" 안내
    - Markdown 코드블록, 표 스타일링 (tailwind prose 클래스)
  - **사이드바 메뉴 추가**: IBK 챗봇 서비스 메뉴에 "일일 리포트" 항목 추가
    - `apps/frontend-next/src/config/services.ts` 의 `ibk-chat` service `menu` 배열에:
      `{ id: 'daily-report', label: '일일 리포트', path: '/daily-report' }` 추가
    - 현재 ibk-chat menu: quality, users, ai-performance, batch-analysis, business → 맨 뒤에 daily-report 추가
    - 또는 실제 사이드바 컴포넌트를 직접 수정 (코드베이스 확인 후 결정)

  **Must NOT do**:
  - 기존 Markdown 렌더러 있으면 재사용 (신규 구현 금지)
  - 프리미엄 Markdown 라이브러리 추가 금지 (react-markdown으로 충분)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (T12-T13 동시)
  - **Blocks**: F3 (E2E QA)
  - **Blocked By**: T5 (API 훅), T12 (목록 페이지 구조 참조)

  **References**:
  - `apps/frontend-next/src/config/services.ts` — ibk-chat menu 배열 (현재 quality/users/ai-performance/batch-analysis/business, 여기에 daily-report 추가)
  - `apps/frontend-next/src/app/dashboard/services/[serviceId]/` — 실제 App Router 구조
  - `apps/frontend-next/src/app/dashboard/services/[serviceId]/batch-analysis/page.tsx` — 참조 레이아웃
  - `apps/frontend-next/src/hooks/queries/use-ibk-chat-report.ts` — T5 훅
  - `apps/frontend-next/package.json` — react-markdown 설치 여부 확인

  **Acceptance Criteria**:
  - [ ] `/dashboard/services/ibk-chat/daily-report/2026-02-17` URL 접근 시 Markdown 뷰어 렌더링
  - [ ] IBK 챗봇 사이드바에 "일일 리포트" 메뉴 항목 표시
  - [ ] RUNNING 상태 폴링 로직 존재 (refetchInterval)
  - [ ] "← 목록으로" 뒤로가기 버튼 동작

  **QA Scenarios**:

  ```
  Scenario: Markdown 뷰어 렌더링
    Tool: Playwright
    Preconditions: COMPLETED 상태 리포트가 DB에 존재
    Steps:
      1. page.goto('http://localhost:3001/dashboard/services/ibk-chat/daily-report/2026-02-17')
      2. page.waitForSelector('.prose, [data-testid="report-content"]')
      3. page.screenshot({ path: 'report-viewer.png' })
    Expected Result: 섹션 A, B, C... 헤딩 포함 Markdown 렌더링됨
    Evidence: .sisyphus/evidence/task-13-viewer.png

  Scenario: 사이드바 메뉴 항목 확인
    Tool: Playwright
    Steps:
      1. page.goto('http://localhost:3001/dashboard/services/ibk-chat')
      2. page.locator('nav a:has-text("일일 리포트")').isVisible()
    Expected Result: true
    Evidence: .sisyphus/evidence/task-13-sidebar.png
  ```

  **Commit**: YES (Wave 4 그룹)
  - Message: `feat(frontend): add ibk-chat daily report list page and markdown viewer`
  - Files: `apps/frontend-next/src/app/dashboard/services/[serviceId]/daily-report/`, `apps/frontend-next/src/config/services.ts`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  플랜 전체를 end-to-end로 읽는다. 각 "Must Have" 요건에 대해 구현이 존재하는지 파일 읽기/curl로 확인. 각 "Must NOT Have" 가드레일에 대해 codebase 검색으로 위반 코드 없음을 확인. `.sisyphus/evidence/` 하위 evidence 파일이 모두 존재하는지 체크.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  `tsc --noEmit` 실행. 새로 추가된 파일 전체에서: `as any`/`@ts-ignore`, 빈 catch, console.log, 주석처리 코드, 미사용 import, AI slop(data/result/item/temp 변수명) 검사. Prisma 스키마 유효성 확인 (`prisma validate`).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **E2E QA** — `unspecified-high` (playwright skill for frontend)
  백엔드 앱 실행 후: 수동 생성 API 호출 → 상태 폴링 → 완료된 리포트 조회 → Markdown 섹션 A-G 포함 여부 확인. 프론트엔드: `/ibks/ibk-chat/daily-report` 페이지 로드 → 목록 렌더링 → 항목 클릭 → Markdown 뷰어 렌더링 스크린샷.
  Output: `API [N/N pass] | Frontend [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  각 태스크의 "What to do"와 실제 코드 diff를 1:1 대조. "Must NOT do" 위반 검사. 태스크 간 파일 오염(cross-task contamination) 여부 확인. 계획에 없는 변경 사항 플래그.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N] | Unaccounted [CLEAN/N] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(ibk-chat-report): add prisma schema, queries, types, module scaffolding`
- **Wave 2**: `feat(ibk-chat-report): implement data collector, question scorer, report builder`
- **Wave 3**: `feat(ibk-chat-report): add orchestrator service, REST API, scheduler`
- **Wave 4**: `feat(frontend): add ibk-chat daily report list page and markdown viewer`

---

## Success Criteria

### Verification Commands
```bash
# 백엔드 빌드 확인
pnpm build:backend  # Expected: 0 errors

# Prisma 스키마 검증
pnpm --filter backend prisma validate  # Expected: success

# API 수동 생성 트리거
curl -X POST http://localhost:3000/projects/ibks/api/ibk-chat-report/generate \
  -H "Authorization: Bearer {JWT}" \
  -H "Content-Type: application/json" \
  -d '{"targetDate": "2026-02-18"}'
# Expected: {"status": "RUNNING", "reportId": "..."}

# 리포트 조회
curl http://localhost:3000/projects/ibks/api/ibk-chat-report/2026-02-18 \
  -H "Authorization: Bearer {JWT}"
# Expected: {"status": "COMPLETED", "reportMarkdown": "# IBK-CHAT 일일 리포트..."}
```

### Final Checklist
- [ ] `IbkChatDailyReport` 테이블 생성됨
- [ ] BigQuery 쿼리 7종이 IBK-CHAT 특화 필드를 올바르게 참조
- [ ] 생성 리포트에 섹션 A-G 포함
- [ ] 스케줄러 매일 02:00 KST 등록됨
- [ ] 동시 실행 방지 (RUNNING 상태 409 반환)
- [ ] 최소 데이터 미달 시 SKIPPED 처리
- [ ] 프론트엔드 `/dashboard/services/ibk-chat/daily-report` 목록+뷰어 렌더링 확인
- [ ] IBK 챗봇 사이드바에 "일일 리포트" 메뉴 추가됨
