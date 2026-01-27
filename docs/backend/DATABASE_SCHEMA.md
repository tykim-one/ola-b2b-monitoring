# Database Schema

OLA B2B Monitoring 백엔드는 두 가지 데이터베이스 시스템을 사용합니다:
1. **SQLite (Prisma)**: 어드민 기능 (인증, 권한, 필터, 분석 세션)
2. **BigQuery**: LLM 로그 데이터 (Cloud Logging Sink)

## 목차

- [Prisma Schema (SQLite)](#prisma-schema-sqlite)
  - [인증/권한 테이블](#인증권한-테이블)
  - [기능 테이블](#기능-테이블)
  - [배치 분석 테이블](#배치-분석-테이블)
  - [FAQ 분석 테이블](#faq-분석-테이블)
  - [유저 프로파일링 테이블](#유저-프로파일링-테이블)
- [BigQuery Schema](#bigquery-schema)
  - [테이블 구조](#테이블-구조)
  - [쿼리 작성 시 주의사항](#쿼리-작성-시-주의사항)

---

## Prisma Schema (SQLite)

백엔드의 Prisma 스키마는 `/apps/backend/prisma/schema.prisma`에 정의되어 있습니다.

### Prisma 명령어

```bash
cd apps/backend

# Prisma Client 생성
pnpm prisma:generate

# 스키마 적용 (개발)
pnpm prisma db push

# 시드 데이터 삽입 (admin@ola.com / admin123)
pnpm prisma:seed

# Prisma Studio 실행 (GUI)
pnpm prisma:studio

# 마이그레이션 생성 (프로덕션용)
pnpm prisma:migrate
```

---

### 인증/권한 테이블

#### User (사용자 계정)

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  password        String    // bcrypt hashed
  name            String
  isActive        Boolean   @default(true)
  failedAttempts  Int       @default(0)  // 로그인 실패 시도 카운트
  lockedUntil     DateTime? // 계정 잠금 해제 시각 (5회 실패 시 15분 잠금)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?

  // Relations
  userRoles        UserRole[]
  refreshTokens    RefreshToken[]
  savedFilters     SavedFilter[]
  analysisSessions AnalysisSession[]
  auditLogs        AuditLog[]
  apiKeys          ApiKey[]
}
```

**주요 필드 설명**:
- `failedAttempts`: 로그인 실패 시도 카운트 (5회 초과 시 계정 15분 잠금)
- `lockedUntil`: 계정 잠금 해제 시각 (null이면 잠금 없음)
- `password`: bcrypt 해시 (salt rounds: 10)

#### Role (역할)

```prisma
model Role {
  id          String   @id @default(uuid())
  name        String   @unique  // e.g., "admin", "analyst", "viewer"
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  userRoles       UserRole[]
  rolePermissions RolePermission[]
}
```

**기본 역할**:
- `admin`: 전체 권한 (사용자 관리, 역할 관리, 분석 등)
- `analyst`: 분석 기능만 사용 가능
- `viewer`: 읽기 전용

#### Permission (권한)

```prisma
model Permission {
  id          String   @id @default(uuid())
  name        String   @unique  // e.g., "metrics:read", "admin:write"
  description String?
  createdAt   DateTime @default(now())

  // Relations
  rolePermissions RolePermission[]
}
```

**권한 형식**: `resource:action`

| 권한 이름 | 설명 |
|----------|------|
| `admin:read` | 사용자/역할 조회 |
| `admin:write` | 사용자/역할 생성/수정/삭제 |
| `analysis:read` | 분석 세션 조회 |
| `analysis:write` | 분석 세션 생성/메시지 전송 |
| `filters:read` | 저장된 필터 조회 |
| `filters:write` | 필터 생성/수정/삭제 |
| `metrics:read` | 메트릭 조회 (Phase 1: Public) |

#### UserRole (사용자-역할 매핑)

```prisma
model UserRole {
  id        String   @id @default(uuid())
  userId    String
  roleId    String
  createdAt DateTime @default(now())

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
}
```

**특징**:
- Many-to-Many 관계 (한 사용자가 여러 역할 가질 수 있음)
- Cascade 삭제 (사용자/역할 삭제 시 매핑도 삭제)

#### RolePermission (역할-권한 매핑)

```prisma
model RolePermission {
  id           String   @id @default(uuid())
  roleId       String
  permissionId String
  createdAt    DateTime @default(now())

  // Relations
  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
}
```

#### RefreshToken (JWT 리프레시 토큰)

```prisma
model RefreshToken {
  id        String    @id @default(uuid())
  token     String    @unique
  userId    String
  expiresAt DateTime  // 발급일 + 7일
  createdAt DateTime  @default(now())
  revokedAt DateTime? // 로그아웃 시 폐기

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}
```

**토큰 관리**:
- Access Token: 15분 유효 (JWT, 서버 저장 안 함)
- Refresh Token: 7일 유효 (DB 저장, httpOnly 쿠키)
- 토큰 갱신 시 기존 Refresh Token 폐기 (Rotation)

---

### 기능 테이블

#### SavedFilter (저장된 데이터 필터)

```prisma
model SavedFilter {
  id          String   @id @default(uuid())
  userId      String
  name        String
  description String?
  criteria    String   // JSON string of FilterCriteria
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**criteria JSON 예시**:
```json
{
  "days": 7,
  "tenantId": "tenant-123",
  "startDate": "2025-01-01",
  "endDate": "2025-01-23"
}
```

#### AnalysisSession (LLM 분석 세션)

```prisma
model AnalysisSession {
  id        String   @id @default(uuid())
  userId    String
  title     String
  context   String?  // JSON string of session context (metrics snapshot)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user     User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages AnalysisMessage[]

  @@index([userId])
}
```

**context JSON 예시**:
```json
{
  "projectId": "my-project",
  "dateRange": "7d",
  "metricsSnapshot": {
    "totalRequests": 1234,
    "successRate": 98.5
  }
}
```

#### AnalysisMessage (LLM 분석 대화 기록)

```prisma
model AnalysisMessage {
  id        String   @id @default(uuid())
  sessionId String
  role      String   // "user" | "assistant"
  content   String
  metadata  String?  // JSON string (token count, model used, etc.)
  createdAt DateTime @default(now())

  // Relations
  session AnalysisSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}
```

**metadata JSON 예시**:
```json
{
  "inputTokens": 150,
  "outputTokens": 250,
  "model": "gemini-1.5-flash",
  "latencyMs": 1234
}
```

#### AuditLog (감사 로그, 90일 보관)

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String   // e.g., "user.login", "role.assign", "analysis.create"
  resource   String?  // affected resource type
  resourceId String?  // affected resource id
  details    String?  // JSON string of additional details
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  // Relations
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

**사용 예시**:
- 사용자 로그인 기록
- 역할 변경 기록
- 분석 세션 생성/삭제 기록

#### ApiKey (외부 통합용 API 키, 마이그레이션 Phase 2용)

```prisma
model ApiKey {
  id          String    @id @default(uuid())
  userId      String
  name        String
  key         String    @unique
  permissions String    // JSON array of permission names
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([key])
  @@index([userId])
}
```

**permissions JSON 예시**:
```json
["metrics:read", "analytics:read"]
```

---

### 배치 분석 테이블

#### BatchAnalysisJob (배치 분석 작업)

```prisma
model BatchAnalysisJob {
  id             String    @id @default(uuid())
  status         String    // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
  targetDate     DateTime  // 분석 대상 날짜
  tenantId       String?   // null이면 전체 테넌트
  sampleSize     Int       @default(100)
  promptTemplate String    // 분석에 사용할 프롬프트

  totalItems     Int       @default(0)
  processedItems Int       @default(0)
  failedItems    Int       @default(0)

  startedAt       DateTime?
  completedAt     DateTime?
  errorMessage    String?   // 실패 시 에러 메시지
  cancelRequested Boolean   @default(false)  // 취소 요청 플래그
  createdAt       DateTime  @default(now())

  // Relations
  results BatchAnalysisResult[]

  @@index([status])
  @@index([targetDate])
}
```

**상태 전이**:
```
PENDING → RUNNING → COMPLETED
                  ↓
                FAILED
                  ↓
              CANCELLED
```

#### BatchAnalysisResult (개별 분석 결과)

```prisma
model BatchAnalysisResult {
  id            String   @id @default(uuid())
  jobId         String

  // 원본 데이터 참조
  originalTimestamp DateTime
  tenantId      String
  sessionId     String?
  userInput     String   // BigQuery에서 가져온 원본
  llmResponse   String   // BigQuery에서 가져온 원본

  // LLM 분석 결과
  analysisPrompt  String  // 실제 사용된 프롬프트
  analysisResult  String  // LLM 분석 응답 (원본 JSON)
  modelName       String  // 사용된 모델 (gemini-2.0-flash 등)
  latencyMs       Int     // LLM 호출 응답시간
  inputTokens     Int     @default(0)
  outputTokens    Int     @default(0)

  // 파싱된 분석 결과 (집계/필터링용)
  qualityScore    Int?      // 1-10 품질 점수
  relevance       Int?      // 1-10 관련성 점수
  completeness    Int?      // 1-10 완성도 점수
  clarity         Int?      // 1-10 명확성 점수
  sentiment       String?   // "positive" | "neutral" | "negative"
  summaryText     String?   // 한 줄 요약
  issues          String?   // JSON array of strings
  improvements    String?   // JSON array of strings
  missingData     String?   // JSON array of objects (optional)
  issueCount      Int?      // issues 배열 길이
  avgScore        Float?    // (quality + relevance + completeness + clarity) / 4

  status        String   // SUCCESS, FAILED
  errorMessage  String?

  createdAt     DateTime @default(now())

  // Relations
  job BatchAnalysisJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@index([tenantId])
}
```

**analysisResult JSON 예시** (LLM 응답):
```json
{
  "quality": 8,
  "relevance": 9,
  "completeness": 7,
  "clarity": 8,
  "sentiment": "positive",
  "summary": "사용자 질문에 적절히 응답함",
  "issues": ["응답이 다소 장황함"],
  "improvements": ["핵심만 간결하게 답변"],
  "missingData": []
}
```

#### AnalysisPromptTemplate (분석 프롬프트 템플릿)

```prisma
model AnalysisPromptTemplate {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  prompt      String   // 프롬프트 템플릿 ({{user_input}}, {{llm_response}} 변수 지원)
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**프롬프트 예시**:
```
다음 대화의 품질을 평가하세요:

사용자: {{user_input}}
AI: {{llm_response}}

JSON 형식으로 응답:
{
  "quality": 1-10,
  "relevance": 1-10,
  "completeness": 1-10,
  "clarity": 1-10,
  "sentiment": "positive/neutral/negative",
  "summary": "한 줄 요약",
  "issues": ["이슈1", "이슈2"],
  "improvements": ["개선점1"]
}
```

#### BatchSchedulerConfig (배치 분석 스케줄러 설정)

```prisma
model BatchSchedulerConfig {
  id               String   @id @default(uuid())
  name             String   // 스케줄 이름 (예: "오전 분석", "야간 분석")
  isEnabled        Boolean  @default(true)

  // 시간 설정
  hour             Int      @default(8)    // 0-23
  minute           Int      @default(10)   // 0-59
  daysOfWeek       String   @default("1,2,3,4,5,6,0")  // 0=일, 1=월, ..., 6=토 (콤마 구분)
  timeZone         String   @default("Asia/Seoul")

  // 분석 대상 설정
  targetTenantId   String?  // null = 전체 테넌트
  sampleSize       Int      @default(100)
  promptTemplateId String?  // null이면 기본 템플릿 사용

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([isEnabled])
}
```

**스케줄 설정 예시**:
- 매주 월-금 오전 8:10 (Asia/Seoul)
- 대상: 전체 테넌트
- 샘플 크기: 100

---

### FAQ 분석 테이블

#### FAQAnalysisJob (FAQ 분석 작업)

```prisma
model FAQAnalysisJob {
  id              String    @id @default(uuid())
  status          String    @default("PENDING") // PENDING | RUNNING | COMPLETED | FAILED
  tenantId        String?   // null = 전체 테넌트
  periodDays      Int       @default(7) // 7 | 14 | 30
  topN            Int       @default(10) // 10 | 20 | 50

  totalQuestions  Int?      // 분석된 총 질문 수
  clusterCount    Int?      // 생성된 클러스터 수
  llmMergeApplied Boolean   @default(false)

  startedAt       DateTime?
  completedAt     DateTime?
  errorMessage    String?
  createdAt       DateTime  @default(now())

  // Relations
  results         FAQAnalysisResult[]

  @@index([status])
  @@index([createdAt])
}
```

#### FAQAnalysisResult (FAQ 분석 결과, 클러스터)

```prisma
model FAQAnalysisResult {
  id                     String   @id @default(uuid())
  jobId                  String

  rank                   Int      // 빈도 순위
  representativeQuestion String   // 대표 질문
  frequency              Int      // 총 빈도
  reasonAnalysis         String   // LLM 사유 분석
  isMerged               Boolean  @default(false) // LLM 병합 여부

  questions              String   // JSON: [{text, count, tenantId}]

  createdAt              DateTime @default(now())

  // Relations
  job FAQAnalysisJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
}
```

**questions JSON 예시**:
```json
[
  {
    "text": "배송 조회",
    "count": 50,
    "tenantId": "tenant-123"
  },
  {
    "text": "배송 상태 확인",
    "count": 30,
    "tenantId": "tenant-456"
  }
]
```

---

### 유저 프로파일링 테이블

#### UserProfile (유저 프로필 요약, 배치 생성)

```prisma
model UserProfile {
  id              String   @id @default(uuid())
  userId          String   @unique  // x_enc_data (BigQuery의 request_metadata.x_enc_data)
  tenantId        String

  // 감정 분석 집계
  frustrationRate Float    @default(0)  // 불만 비율 (0-1)
  aggressiveCount Int      @default(0)  // 공격적 메시지 수

  // 카테고리 분포 (JSON)
  categoryDistribution String  @default("{}") // JSON: { "complaint": 5, "product_inquiry": 10, ... }

  // LLM 생성 요약
  behaviorSummary String?  // 유저 행동 요약 텍스트
  mainInterests   String?  // 주요 관심사
  painPoints      String?  // 주요 불만/문제점

  // 메타데이터
  totalMessages    Int      @default(0)
  analyzedMessages Int      @default(0)
  lastAnalyzedAt   DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([tenantId])
}
```

#### MessageCategoryAnalysis (메시지별 카테고리 분석 결과)

```prisma
model MessageCategoryAnalysis {
  id          String   @id @default(uuid())
  userId      String   // x_enc_data
  tenantId    String
  messageHash String   // user_input 해시 (중복 방지)

  category    String   // QuestionCategory enum value
  confidence  Float    @default(0.8) // 분류 신뢰도 (0-1)
  sentiment   String   @default("neutral") // positive/neutral/negative
  isAggressive Boolean @default(false)

  userInput   String   // 원본 질문 (참조용)
  timestamp   DateTime
  createdAt   DateTime @default(now())

  @@unique([userId, messageHash])
  @@index([userId])
  @@index([tenantId])
  @@index([category])
}
```

**QuestionCategory enum**:
```typescript
enum QuestionCategory {
  PRODUCT_INQUIRY = 'product_inquiry',
  SHIPPING = 'shipping',
  COMPLAINT = 'complaint',
  REFUND = 'refund',
  ACCOUNT = 'account',
  TECHNICAL = 'technical',
  GENERAL = 'general',
}
```

#### UserProfilingJob (유저 프로파일링 배치 작업)

```prisma
model UserProfilingJob {
  id             String    @id @default(uuid())
  status         String    @default("PENDING")  // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
  targetDate     DateTime  // 분석 대상 날짜
  tenantId       String?   // null = 전체 테넌트

  totalUsers     Int       @default(0)
  processedUsers Int       @default(0)
  failedUsers    Int       @default(0)

  startedAt      DateTime?
  completedAt    DateTime?
  errorMessage   String?
  createdAt      DateTime  @default(now())

  @@index([status])
  @@index([targetDate])
}
```

---

## BigQuery Schema

BigQuery는 Cloud Logging Sink로부터 LLM 로그를 수집하며, **플랫 스키마**를 사용합니다 (중첩 구조 아님).

### 테이블 구조

**테이블 이름**: `{project_id}.{dataset_id}.{table_id}`

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `timestamp` | TIMESTAMP | 로그 생성 시각 |
| `tenant_id` | STRING | 테넌트 ID |
| `success` | BOOL | 성공 여부 (TRUE/FALSE) |
| `input_tokens` | STRING | 입력 토큰 수 (CAST AS FLOAT64 필요) |
| `output_tokens` | STRING | 출력 토큰 수 (CAST AS FLOAT64 필요) |
| `total_tokens` | STRING | 총 토큰 수 (CAST AS FLOAT64 필요) |
| `user_input` | STRING | 사용자 질문 |
| `llm_response` | STRING | LLM 응답 |
| `severity` | STRING | 로그 레벨 (INFO/WARN/ERROR) |
| `request_metadata` | STRUCT | 요청 메타데이터 (아래 참조) |

#### request_metadata STRUCT

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `service` | STRING | 서비스 이름 |
| `endpoint` | STRING | API 엔드포인트 |
| `session_id` | STRING | 세션 ID |
| `x_enc_data` | STRING | 암호화된 유저 ID |

---

### 쿼리 작성 시 주의사항

#### 1. 토큰 값 캐스팅

토큰 필드는 STRING 타입이므로 숫자 연산 시 반드시 CAST 필요:

```sql
SELECT
  CAST(total_tokens AS FLOAT64) AS total_tokens,
  CAST(input_tokens AS FLOAT64) AS input_tokens,
  CAST(output_tokens AS FLOAT64) AS output_tokens
FROM `project.dataset.logs`
WHERE CAST(total_tokens AS FLOAT64) > 1000
```

#### 2. success 비교

`success` 필드는 BOOL 타입이므로 STRING 'true'와 비교하지 않음:

```sql
-- ✅ 올바른 방법
WHERE success = TRUE

-- ❌ 잘못된 방법
WHERE success = 'true'
```

#### 3. DATE 타입 정규화

BigQuery는 `DATE(timestamp)`를 `{ value: '2025-01-15' }` 객체로 반환합니다.
반드시 `normalizeDate()` 헬퍼 함수 사용:

```typescript
// bigquery-metrics.datasource.ts
private normalizeDate(dateObj: any): string {
  if (typeof dateObj === 'string') return dateObj;
  if (dateObj?.value) return dateObj.value;
  return String(dateObj);
}

// 사용 예시
const rows = await this.query(sql);
const normalized = rows.map(row => ({
  ...row,
  date: this.normalizeDate(row.date),
}));
```

#### 4. request_metadata STRUCT 접근

STRUCT 타입이므로 `JSON_VALUE()` 사용 금지. 대신 `.` 연산자 사용:

```sql
-- ✅ 올바른 방법
SELECT
  request_metadata.session_id,
  request_metadata.x_enc_data
FROM `project.dataset.logs`

-- ❌ 잘못된 방법
SELECT
  JSON_VALUE(request_metadata, '$.session_id')  -- STRUCT는 JSON 함수 불가
FROM `project.dataset.logs`
```

#### 5. 날짜 필터링

```sql
-- 최근 7일
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)

-- 특정 날짜
WHERE DATE(timestamp) = '2025-01-23'

-- 날짜 범위
WHERE DATE(timestamp) BETWEEN '2025-01-01' AND '2025-01-23'
```

#### 6. 집계 쿼리 예시

```sql
SELECT
  tenant_id,
  COUNT(*) AS total_requests,
  COUNTIF(success = TRUE) AS success_count,
  COUNTIF(success = FALSE) AS error_count,
  ROUND(100.0 * COUNTIF(success = TRUE) / COUNT(*), 2) AS success_rate,
  ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) AS avg_tokens
FROM `project.dataset.logs`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY tenant_id
ORDER BY total_requests DESC
LIMIT 10
```

---

## 데이터베이스 마이그레이션

### Prisma 마이그레이션 (프로덕션)

```bash
cd apps/backend

# 1. 마이그레이션 파일 생성
pnpm prisma migrate dev --name add_new_field

# 2. 프로덕션에 적용
pnpm prisma migrate deploy

# 3. Prisma Client 재생성
pnpm prisma:generate
```

### BigQuery 스키마 변경

BigQuery는 Cloud Logging Sink로부터 자동으로 스키마를 감지하므로, 새 필드 추가는 자동으로 반영됩니다.

**주의사항**:
- 기존 필드 타입 변경은 불가 (새 테이블 생성 필요)
- STRUCT 필드 추가는 Cloud Logging 설정 변경 필요

---

## 시드 데이터

### Prisma 시드 스크립트

`apps/backend/prisma/seed.ts`는 초기 데이터를 생성합니다:

```bash
pnpm prisma:seed
```

**생성되는 데이터**:
- Admin 사용자: `admin@ola.com` / `admin123`
- 역할: `admin`, `analyst`, `viewer`
- 권한: `admin:read`, `admin:write`, `analysis:read`, `analysis:write`, `filters:read`, `filters:write`, `metrics:read`

---

## 성능 최적화

### 인덱스 전략

Prisma 스키마에서 자주 조회되는 필드에 인덱스를 추가했습니다:

```prisma
@@index([userId])      // 사용자별 조회
@@index([status])      // 상태별 필터링
@@index([createdAt])   // 날짜별 정렬
@@index([tenantId])    // 테넌트별 조회
```

### BigQuery 파티셔닝

BigQuery 테이블은 `timestamp` 필드로 파티셔닝되어 쿼리 성능 및 비용 절감:

```sql
-- 파티셔닝된 테이블 쿼리 (스캔 범위 제한)
SELECT *
FROM `project.dataset.logs`
WHERE DATE(timestamp) = '2025-01-23'  -- 하루치만 스캔
```

---

## 요약

- **SQLite (Prisma)**: 어드민 기능 (인증, 권한, 필터, 분석 세션)
  - 15개 테이블
  - UUID 기본 키
  - Cascade 삭제 관계
  - bcrypt 비밀번호 해시
  - 90일 감사 로그

- **BigQuery**: LLM 로그 데이터
  - 플랫 스키마 (중첩 구조 아님)
  - STRUCT 타입 (request_metadata)
  - STRING 토큰 필드 (CAST 필요)
  - 타임스탬프 파티셔닝

더 자세한 내용은 다음 문서를 참고하세요:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 백엔드 아키텍처 설계
- [API_REFERENCE.md](./API_REFERENCE.md) - 전체 API 엔드포인트 목록
