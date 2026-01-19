# 데이터베이스 스키마

시스템에서 사용하는 데이터베이스 구조를 설명합니다.

---

## 목차
1. [개요](#1-개요)
2. [Prisma 스키마 (SQLite)](#2-prisma-스키마-sqlite)
3. [BigQuery 스키마](#3-bigquery-스키마)
4. [공유 타입 (@ola/shared-types)](#4-공유-타입)

---

## 1. 개요

### 데이터베이스 구성

| 데이터베이스 | 용도 | 기술 |
|-------------|------|------|
| **SQLite** | 관리자 데이터 (사용자, 역할, 분석 결과) | Prisma ORM |
| **BigQuery** | LLM 로그 데이터 | Google Cloud |

### 관계도

```
┌─────────────────────────────────────────────────────────────────┐
│                        SQLite (Admin DB)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────┐     ┌──────────┐     ┌────────┐                     │
│  │  User  │────>│ UserRole │<────│  Role  │                     │
│  └────────┘     └──────────┘     └────────┘                     │
│       │                               │                          │
│       │                               ▼                          │
│       │                        ┌────────────────┐                │
│       │                        │ RolePermission │                │
│       │                        └────────────────┘                │
│       │                               │                          │
│       ▼                               ▼                          │
│  ┌────────────┐              ┌────────────┐                     │
│  │RefreshToken│              │ Permission │                     │
│  └────────────┘              └────────────┘                     │
│       │                                                          │
│       │                                                          │
│  ┌────┴─────────────────────────────────────────┐               │
│  │                                               │               │
│  ▼                                               ▼               │
│  ┌────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │SavedFilter │  │AnalysisSession  │  │ BatchAnalysisJob│       │
│  └────────────┘  └─────────────────┘  └─────────────────┘       │
│                          │                     │                 │
│                          ▼                     ▼                 │
│                  ┌─────────────────┐  ┌─────────────────────┐   │
│                  │AnalysisMessage  │  │ BatchAnalysisResult │   │
│                  └─────────────────┘  └─────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        BigQuery (Log DB)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   logs 테이블                                                    │
│   - timestamp, tenant_id, success                               │
│   - input_tokens, output_tokens, total_tokens                   │
│   - user_input, llm_response                                    │
│   - severity, request_metadata                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Prisma 스키마 (SQLite)

**파일 위치**: `apps/backend/prisma/schema.prisma`

### 2.1 인증/인가 테이블

#### User (사용자)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| email | String | 로그인 이메일 (유니크) |
| password | String | bcrypt 해시 비밀번호 |
| name | String | 표시 이름 |
| isActive | Boolean | 활성 상태 (기본: true) |
| failedAttempts | Int | 로그인 실패 횟수 (기본: 0) |
| lockedUntil | DateTime? | 계정 잠금 해제 시간 |
| createdAt | DateTime | 생성 시간 |
| updatedAt | DateTime | 수정 시간 |
| lastLoginAt | DateTime? | 마지막 로그인 시간 |

**관계**: UserRoles, RefreshTokens, SavedFilters, AnalysisSessions, AuditLogs, ApiKeys

---

#### Role (역할)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| name | String | 역할 이름 (유니크) |
| description | String | 역할 설명 |
| createdAt | DateTime | 생성 시간 |
| updatedAt | DateTime | 수정 시간 |

**관계**: UserRoles, RolePermissions

**기본 역할**:
- `admin`: 시스템 관리자 (모든 권한)
- `analyst`: 데이터 분석가 (분석 권한)
- `viewer`: 뷰어 (읽기 권한)

---

#### Permission (권한)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| name | String | 권한 이름 (유니크) |
| description | String | 권한 설명 |
| createdAt | DateTime | 생성 시간 |

**권한 목록**:

| 권한 | 설명 |
|------|------|
| admin:read | 관리자 메뉴 읽기 |
| admin:write | 관리자 메뉴 수정 |
| analysis:read | 분석 결과 조회 |
| analysis:write | 분석 실행 |
| filters:read | 필터 조회 |
| filters:write | 필터 수정 |

---

#### UserRole (사용자-역할 매핑)

다대다 관계 테이블

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| userId | String | 사용자 FK |
| roleId | String | 역할 FK |
| createdAt | DateTime | 생성 시간 |

**제약조건**: (userId, roleId) 유니크, 부모 삭제 시 Cascade

---

#### RolePermission (역할-권한 매핑)

다대다 관계 테이블

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| roleId | String | 역할 FK |
| permissionId | String | 권한 FK |
| createdAt | DateTime | 생성 시간 |

**제약조건**: (roleId, permissionId) 유니크, 부모 삭제 시 Cascade

---

#### RefreshToken (리프레시 토큰)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| token | String | 토큰 값 (유니크) |
| userId | String | 사용자 FK |
| expiresAt | DateTime | 만료 시간 |
| createdAt | DateTime | 생성 시간 |
| revokedAt | DateTime? | 무효화 시간 |

**인덱스**: userId, expiresAt

---

### 2.2 기능 테이블

#### SavedFilter (저장된 필터)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| userId | String | 사용자 FK |
| name | String | 필터 이름 |
| description | String | 필터 설명 |
| criteria | String | JSON 형식 필터 조건 |
| isDefault | Boolean | 기본 필터 여부 |
| createdAt | DateTime | 생성 시간 |
| updatedAt | DateTime | 수정 시간 |

**criteria 구조**:
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-19",
  "tenantIds": ["tenant-a", "tenant-b"],
  "severities": ["INFO", "WARN", "ERROR"],
  "minTokens": 100,
  "maxTokens": 5000,
  "searchQuery": "키워드"
}
```

---

#### AnalysisSession (분석 세션)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| userId | String | 사용자 FK |
| title | String | 세션 제목 |
| context | String | JSON 형식 분석 컨텍스트 |
| createdAt | DateTime | 생성 시간 |
| updatedAt | DateTime | 수정 시간 |

**context 구조**:
```json
{
  "projectId": "project-1",
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-01-19"
  },
  "metricsSnapshot": {
    "realtimeKPI": { ... },
    "tenantUsage": [ ... ]
  }
}
```

---

#### AnalysisMessage (분석 메시지)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| sessionId | String | 세션 FK |
| role | String | "user" 또는 "assistant" |
| content | String | 메시지 내용 (마크다운 지원) |
| metadata | String | JSON 형식 메타데이터 |
| createdAt | DateTime | 생성 시간 |

**metadata 구조** (assistant 메시지):
```json
{
  "inputTokens": 150,
  "outputTokens": 450,
  "model": "gemini-2.0-flash",
  "latencyMs": 1250
}
```

---

#### AuditLog (감사 로그)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| userId | String? | 사용자 FK (시스템 작업은 null) |
| action | String | 작업 유형 |
| resource | String | 리소스 유형 |
| resourceId | String | 리소스 ID |
| details | String | JSON 형식 상세 정보 |
| ipAddress | String | 요청 IP |
| userAgent | String | 브라우저 정보 |
| createdAt | DateTime | 생성 시간 |

**action 예시**:
- `user.login`, `user.logout`
- `user.create`, `user.update`, `user.delete`
- `role.assign`, `role.revoke`
- `analysis.create`, `analysis.chat`

---

#### ApiKey (API 키)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| userId | String | 사용자 FK |
| name | String | 키 이름 |
| key | String | API 키 값 (유니크) |
| permissions | String | JSON 배열 권한 목록 |
| expiresAt | DateTime? | 만료 시간 |
| lastUsedAt | DateTime? | 마지막 사용 시간 |
| revokedAt | DateTime? | 무효화 시간 |
| createdAt | DateTime | 생성 시간 |

---

### 2.3 배치 분석 테이블

#### BatchAnalysisJob (배치 분석 작업)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| status | String | PENDING, RUNNING, COMPLETED, FAILED |
| targetDate | DateTime | 분석 대상 날짜 |
| tenantId | String? | 대상 테넌트 (null=전체) |
| sampleSize | Int | 샘플 크기 (기본: 100) |
| promptTemplate | String | 사용된 프롬프트 |
| totalItems | Int | 전체 항목 수 |
| processedItems | Int | 처리된 항목 수 |
| failedItems | Int | 실패한 항목 수 |
| startedAt | DateTime? | 시작 시간 |
| completedAt | DateTime? | 완료 시간 |
| createdAt | DateTime | 생성 시간 |

**인덱스**: status, targetDate

---

#### BatchAnalysisResult (배치 분석 결과)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| jobId | String | 작업 FK |
| **원본 데이터** | | |
| originalTimestamp | DateTime | 원본 로그 시간 |
| tenantId | String | 테넌트 ID |
| sessionId | String | 세션 ID |
| userInput | String | 사용자 질문 |
| llmResponse | String | AI 응답 |
| **분석 결과** | | |
| analysisPrompt | String | 분석에 사용된 프롬프트 |
| analysisResult | String | LLM 분석 결과 (JSON) |
| modelName | String | 사용된 모델 |
| inputTokens | Int | 입력 토큰 수 |
| outputTokens | Int | 출력 토큰 수 |
| latencyMs | Int | 응답 시간 (ms) |
| **파싱된 점수** | | |
| qualityScore | Int | 품질 점수 (1-10) |
| relevance | Int | 관련성 (1-10) |
| completeness | Int | 완결성 (1-10) |
| clarity | Int | 명확성 (1-10) |
| avgScore | Float | 평균 점수 |
| sentiment | String | positive, neutral, negative |
| summaryText | String | 한 줄 요약 |
| issues | String | JSON 배열 - 발견된 이슈 |
| improvements | String | JSON 배열 - 개선 제안 |
| missingData | String | JSON 배열 - 누락 정보 |
| issueCount | Int | 이슈 개수 |
| **상태** | | |
| status | String | SUCCESS, FAILED |
| errorMessage | String? | 오류 메시지 |
| createdAt | DateTime | 생성 시간 |

**인덱스**: jobId, tenantId

---

#### AnalysisPromptTemplate (분석 프롬프트 템플릿)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| name | String | 템플릿 이름 (유니크) |
| description | String | 템플릿 설명 |
| prompt | String | 프롬프트 내용 |
| isDefault | Boolean | 기본 템플릿 여부 |
| isActive | Boolean | 활성 상태 |
| createdAt | DateTime | 생성 시간 |
| updatedAt | DateTime | 수정 시간 |

**변수**:
- `{{user_input}}`: 사용자 질문
- `{{llm_response}}`: AI 응답

---

#### BatchSchedulerConfig (배치 스케줄 설정)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본 키 |
| name | String | 스케줄 이름 |
| isEnabled | Boolean | 활성 상태 |
| hour | Int | 실행 시간 (0-23) |
| minute | Int | 실행 분 (0-59) |
| daysOfWeek | String | 실행 요일 (쉼표 구분) |
| timeZone | String | 타임존 (기본: Asia/Seoul) |
| targetTenantId | String? | 대상 테넌트 (null=전체) |
| sampleSize | Int | 샘플 크기 (기본: 100) |
| promptTemplateId | String? | 사용할 템플릿 ID |
| createdAt | DateTime | 생성 시간 |
| updatedAt | DateTime | 수정 시간 |

**daysOfWeek 형식**: `"0,1,2,3,4,5,6"` (0=일요일, 6=토요일)

---

## 3. BigQuery 스키마

### 3.1 logs 테이블

**플랫 스키마** (중첩 JSON 아님)

| 필드 | 타입 | 설명 |
|------|------|------|
| timestamp | TIMESTAMP | 로그 시간 |
| tenant_id | STRING | B2B 테넌트 ID |
| success | BOOL | 요청 성공 여부 |
| input_tokens | STRING | 입력 토큰 수 (문자열) |
| output_tokens | STRING | 출력 토큰 수 (문자열) |
| total_tokens | STRING | 총 토큰 수 (문자열) |
| user_input | STRING | 사용자 질문 |
| llm_response | STRING | AI 응답 |
| severity | STRING | 로그 레벨 (INFO/WARN/ERROR) |
| request_metadata | STRUCT | 메타데이터 구조체 |

### 3.2 request_metadata 구조

| 필드 | 타입 | 설명 |
|------|------|------|
| service | STRING | 서비스 이름 |
| endpoint | STRING | API 엔드포인트 |
| session_id | STRING | 세션 ID |
| x_enc_data | STRING | 암호화된 사용자 ID |

### 3.3 쿼리 작성 주의사항

#### success 비교

```sql
-- 올바름 (BOOL 타입)
WHERE success = TRUE

-- 틀림 (문자열)
WHERE success = 'true'
```

#### 토큰 캐스팅

```sql
-- 숫자 연산 시 캐스팅 필요
SELECT AVG(CAST(total_tokens AS FLOAT64)) as avg_tokens
FROM logs
```

#### DATE 정규화

BigQuery는 DATE 타입을 객체로 반환합니다:
```json
{ "value": "2025-01-19" }
```

코드에서 `normalizeDate()` 헬퍼로 문자열 변환:
```typescript
function normalizeDate(dateValue: any): string {
  if (typeof dateValue === 'object' && dateValue.value) {
    return dateValue.value;
  }
  return String(dateValue);
}
```

#### STRUCT 접근

```sql
-- 올바름 (점 표기법)
SELECT request_metadata.session_id
FROM logs

-- 틀림 (JSON 함수)
SELECT JSON_VALUE(request_metadata, '$.session_id')  -- 작동 안함
```

---

## 4. 공유 타입

**파일 위치**: `packages/shared-types/src/index.ts`

프론트엔드와 백엔드에서 공유하는 TypeScript 타입입니다.

### 4.1 메트릭 타입

```typescript
// 실시간 KPI
interface RealtimeKPI {
  totalRequests: number;
  successRate: number;
  avgTokens: number;
  activeTenants: number;
}

// 시간별 트래픽
interface HourlyTraffic {
  hour: string;
  requests: number;
  avgTokens: number;
}

// 테넌트 사용량
interface TenantUsage {
  tenantId: string;
  totalRequests: number;
  totalTokens: number;
  successRate: number;
  errorCount: number;
}

// 비용 트렌드
interface CostTrend {
  date: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

// 히트맵 셀
interface UsageHeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}
```

### 4.2 품질 분석 타입

```typescript
// 토큰 효율성 트렌드
interface TokenEfficiencyTrend {
  date: string;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgEfficiency: number;
}

// 반복 질문 패턴
interface RepeatedQueryPattern {
  query: string;
  count: number;
  uniqueUsers: number;
  firstSeen: string;
  lastSeen: string;
}

// 감정 분석 결과
interface SentimentAnalysisResult {
  sentiment: 'FRUSTRATED' | 'EMOTIONAL' | 'URGENT' | 'NEUTRAL';
  keywords: string[];
  count: number;
}
```

### 4.3 인증 타입

```typescript
// 로그인 요청
interface LoginRequest {
  email: string;
  password: string;
}

// 로그인 응답
interface LoginResponse {
  accessToken: string;
  user: UserInfo;
}

// 사용자 정보
interface UserInfo {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}
```

### 4.4 관리자 타입

```typescript
// 역할
interface Role {
  id: string;
  name: string;
  description: string;
  permissions?: Permission[];
}

// 권한
interface Permission {
  id: string;
  name: string;
  description: string;
}

// 저장된 필터
interface SavedFilter {
  id: string;
  name: string;
  description: string;
  criteria: FilterCriteria;
  isDefault: boolean;
}

// 필터 조건
interface FilterCriteria {
  startDate?: string;
  endDate?: string;
  tenantIds?: string[];
  severities?: string[];
  minTokens?: number;
  maxTokens?: number;
  searchQuery?: string;
}
```

### 4.5 배치 분석 타입

```typescript
// 배치 작업
interface BatchAnalysisJob {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  targetDate: string;
  tenantId?: string;
  sampleSize: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
}

// 배치 결과
interface BatchAnalysisResult {
  id: string;
  jobId: string;
  tenantId: string;
  userInput: string;
  llmResponse: string;
  qualityScore: number;
  relevance: number;
  completeness: number;
  clarity: number;
  avgScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  issues: string[];
  improvements: string[];
}
```

### 4.6 챗봇 타입

```typescript
// 챗봇 요청
interface ChatbotRequest {
  message: string;
  pageContext: string;
  sessionId?: string;
}

// 챗봇 메시지
interface ChatbotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: ChatbotMessageMetadata;
}

// 메시지 메타데이터
interface ChatbotMessageMetadata {
  pageContext: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
```

---

## Prisma 명령어

```bash
cd apps/backend

# 클라이언트 생성
pnpm prisma:generate

# 스키마 적용 (개발용)
pnpm prisma db push

# 마이그레이션 생성 및 실행
pnpm prisma:migrate

# 시드 데이터
pnpm prisma:seed

# Prisma Studio GUI
pnpm prisma:studio
```

---

## 관련 문서

- [시스템 아키텍처](./03-architecture.md) - 기술 구조
- [API 명세서](./04-api-reference.md) - API 상세
- [데이터 흐름도](./06-data-flow.md) - 시스템 동작
