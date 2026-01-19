# API 명세서

백엔드 REST API의 상세 명세입니다.

---

## 목차
1. [공통 사항](#1-공통-사항)
2. [Metrics API](#2-metrics-api)
3. [Admin Auth API](#3-admin-auth-api)
4. [Admin Users API](#4-admin-users-api)
5. [Admin Roles API](#5-admin-roles-api)
6. [Admin Filters API](#6-admin-filters-api)
7. [Admin Analysis API](#7-admin-analysis-api)
8. [Batch Analysis API](#8-batch-analysis-api)
9. [Chatbot API](#9-chatbot-api)
10. [Anomaly API](#10-anomaly-api)

---

## 1. 공통 사항

### Base URL
```
개발: http://localhost:3000
운영: https://api.your-domain.com
```

### 인증

대부분의 Admin API는 JWT 인증이 필요합니다.

```http
Authorization: Bearer <access_token>
```

### 공통 응답 형식

#### 성공 응답
```json
{
  "success": true,
  "data": { ... },
  "cached": true,
  "cacheTTL": "5 minutes"
}
```

#### 에러 응답
```json
{
  "statusCode": 400,
  "message": "에러 메시지",
  "error": "Bad Request"
}
```

### HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (유효성 검증 실패) |
| 401 | 인증 필요 (토큰 없음/만료) |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 429 | 요청 한도 초과 |
| 500 | 서버 오류 |

---

## 2. Metrics API

**Base Path**: `/projects/:projectId/api`

인증 없이 접근 가능한 공개 API입니다.

### 2.1 실시간 KPI

```http
GET /metrics/realtime
```

**응답**
```json
{
  "totalRequests": 15420,
  "successRate": 97.5,
  "avgTokens": 1250,
  "activeTenants": 12
}
```

### 2.2 시간별 트래픽

```http
GET /metrics/hourly
```

**응답**
```json
[
  { "hour": "00:00", "requests": 120, "avgTokens": 1100 },
  { "hour": "01:00", "requests": 85, "avgTokens": 980 },
  ...
]
```

### 2.3 일별 트래픽

```http
GET /metrics/daily?days=30
```

**쿼리 파라미터**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| days | number | 30 | 조회 기간 (일) |

### 2.4 테넌트 사용량

```http
GET /analytics/tenant-usage?days=7
```

**응답**
```json
[
  {
    "tenantId": "tenant-a",
    "totalRequests": 5000,
    "totalTokens": 1250000,
    "successRate": 98.5,
    "errorCount": 75
  }
]
```

### 2.5 사용량 히트맵

```http
GET /analytics/heatmap
```

**응답**
```json
[
  { "dayOfWeek": 0, "hour": 9, "count": 150 },
  { "dayOfWeek": 0, "hour": 10, "count": 200 },
  ...
]
```

### 2.6 비용 트렌드

```http
GET /analytics/cost-trend
```

**응답**
```json
[
  {
    "date": "2025-01-15",
    "inputTokens": 50000,
    "outputTokens": 150000,
    "estimatedCost": 2500
  }
]
```

### 2.7 에러 분석

```http
GET /analytics/errors
```

### 2.8 사용자 요청 수

```http
GET /analytics/user-requests?days=7&limit=10
```

### 2.9 사용자 토큰 사용량

```http
GET /analytics/user-tokens?days=7&limit=10
```

### 2.10 사용자 질문 패턴

```http
GET /analytics/user-patterns?userId=user123&limit=20
```

### 2.11 사용자 목록

```http
GET /analytics/user-list?days=7&limit=50
```

### 2.12 사용자 활동 상세

```http
GET /analytics/user-activity/:userId?days=30&limit=100&offset=0
```

### 2.13 토큰 효율성

```http
GET /ai/token-efficiency
```

### 2.14 이상 탐지 통계

```http
GET /ai/anomaly-stats
```

### 2.15 쿼리 패턴

```http
GET /ai/query-patterns
```

### 2.16 품질 분석 API

```http
GET /quality/efficiency-trend
GET /quality/query-response-correlation
GET /quality/repeated-patterns
GET /quality/emerging-patterns?recentDays=7&historicalDays=30
GET /quality/sentiment?days=7
GET /quality/rephrased-queries?days=7
GET /quality/sessions?days=7
GET /quality/tenant-summary?days=7
GET /quality/response-metrics?days=7
```

### 2.17 캐시 관리

```http
GET /cache/stats
DELETE /cache
```

---

## 3. Admin Auth API

**Base Path**: `/api/admin/auth`

### 3.1 로그인

```http
POST /login
```

**요청**
```json
{
  "email": "admin@ola.com",
  "password": "admin123"
}
```

**응답**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@ola.com",
    "name": "관리자",
    "roles": ["admin"],
    "permissions": ["admin:read", "admin:write", "..."]
  }
}
```

**쿠키** (자동 설정)
```
Set-Cookie: refreshToken=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800
```

### 3.2 토큰 갱신

```http
POST /refresh
```

쿠키의 refreshToken을 사용하여 새 accessToken 발급

**응답**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3.3 로그아웃

```http
POST /logout
Authorization: Bearer <access_token>
```

refreshToken 무효화 및 쿠키 삭제

---

## 4. Admin Users API

**Base Path**: `/api/admin/users`
**필요 권한**: `admin:read` 또는 `admin:write`

### 4.1 사용자 목록

```http
GET /?page=1&pageSize=20
```

**응답**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "홍길동",
      "isActive": true,
      "lastLoginAt": "2025-01-19T10:00:00Z",
      "roles": [{ "id": "uuid", "name": "analyst" }]
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

### 4.2 사용자 상세

```http
GET /:id
```

### 4.3 사용자 생성

```http
POST /
Authorization: Bearer <token>
```

**요청**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "name": "김철수",
  "roleIds": ["role-uuid-1", "role-uuid-2"]
}
```

**유효성 검증**
- email: 이메일 형식
- password: 최소 8자
- roleIds: UUID 배열

### 4.4 사용자 수정

```http
PUT /:id
```

**요청**
```json
{
  "name": "김철수 (수정)",
  "isActive": true,
  "roleIds": ["role-uuid-1"]
}
```

### 4.5 사용자 삭제

```http
DELETE /:id
```

### 4.6 비밀번호 변경

```http
POST /:id/change-password
```

**요청**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

---

## 5. Admin Roles API

**Base Path**: `/api/admin/roles`
**필요 권한**: `admin:read` 또는 `admin:write`

### 5.1 역할 목록

```http
GET /
```

**응답**
```json
[
  {
    "id": "uuid",
    "name": "admin",
    "description": "시스템 관리자",
    "permissions": [
      { "id": "uuid", "name": "admin:read" },
      { "id": "uuid", "name": "admin:write" }
    ]
  }
]
```

### 5.2 역할 상세

```http
GET /:id
```

### 5.3 역할 생성

```http
POST /
```

**요청**
```json
{
  "name": "analyst",
  "description": "데이터 분석가",
  "permissionIds": ["perm-uuid-1", "perm-uuid-2"]
}
```

### 5.4 역할 수정

```http
PUT /:id
```

### 5.5 역할 삭제

```http
DELETE /:id
```

사용자에게 할당된 역할은 삭제 불가

### 5.6 권한 목록

```http
GET /permissions
```

**응답**
```json
[
  { "id": "uuid", "name": "admin:read", "description": "관리자 메뉴 읽기" },
  { "id": "uuid", "name": "admin:write", "description": "관리자 메뉴 수정" },
  { "id": "uuid", "name": "analysis:read", "description": "분석 결과 조회" },
  { "id": "uuid", "name": "analysis:write", "description": "분석 실행" },
  { "id": "uuid", "name": "filters:read", "description": "필터 조회" },
  { "id": "uuid", "name": "filters:write", "description": "필터 수정" }
]
```

---

## 6. Admin Filters API

**Base Path**: `/api/admin/filters`
**필요 권한**: `filters:read` 또는 `filters:write`

### 6.1 필터 목록

```http
GET /
```

### 6.2 필터 상세

```http
GET /:id
```

### 6.3 필터 생성

```http
POST /
```

**요청**
```json
{
  "name": "지난 주 tenant-a",
  "description": "tenant-a의 지난 주 데이터",
  "criteria": {
    "startDate": "2025-01-12",
    "endDate": "2025-01-19",
    "tenantIds": ["tenant-a"],
    "severities": ["INFO", "WARN"],
    "minTokens": 100,
    "maxTokens": 5000,
    "searchQuery": ""
  }
}
```

### 6.4 필터 수정

```http
PUT /:id
```

### 6.5 필터 삭제

```http
DELETE /:id
```

### 6.6 기본 필터 설정

```http
POST /:id/set-default
```

---

## 7. Admin Analysis API

**Base Path**: `/api/admin/analysis`
**필요 권한**: `analysis:read` 또는 `analysis:write`

### 7.1 세션 생성

```http
POST /sessions
```

**요청**
```json
{
  "title": "1월 품질 분석",
  "context": {
    "projectId": "project-1",
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-01-19"
    }
  }
}
```

### 7.2 세션 목록

```http
GET /sessions?page=1&pageSize=10
```

### 7.3 세션 상세 (메시지 포함)

```http
GET /sessions/:id
```

**응답**
```json
{
  "id": "uuid",
  "title": "1월 품질 분석",
  "context": { ... },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "지난 주 에러율 분석해줘",
      "createdAt": "2025-01-19T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "## 에러율 분석\n\n지난 주 평균 에러율은...",
      "metadata": {
        "inputTokens": 150,
        "outputTokens": 450,
        "model": "gemini-2.0-flash",
        "latencyMs": 1250
      },
      "createdAt": "2025-01-19T10:00:02Z"
    }
  ],
  "createdAt": "2025-01-19T09:55:00Z"
}
```

### 7.4 메시지 전송

```http
POST /sessions/:id/chat
```

**요청**
```json
{
  "message": "FAQ로 등록하면 좋을 패턴을 추천해줘"
}
```

**응답**
```json
{
  "userMessage": {
    "id": "uuid",
    "role": "user",
    "content": "FAQ로 등록하면 좋을 패턴을 추천해줘",
    "createdAt": "..."
  },
  "assistantMessage": {
    "id": "uuid",
    "role": "assistant",
    "content": "## FAQ 추천\n\n분석 결과...",
    "metadata": {
      "inputTokens": 200,
      "outputTokens": 600,
      "model": "gemini-2.0-flash",
      "latencyMs": 1800
    },
    "createdAt": "..."
  }
}
```

### 7.5 세션 삭제

```http
DELETE /sessions/:id
```

---

## 8. Batch Analysis API

**Base Path**: `/api/admin/batch-analysis`
**필요 권한**: `analysis:read` 또는 `analysis:write`

### 8.1 작업 목록

```http
GET /jobs?status=COMPLETED&targetDate=2025-01-18&tenantId=tenant-a
```

**쿼리 파라미터**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| status | string | PENDING, RUNNING, COMPLETED, FAILED |
| targetDate | string | YYYY-MM-DD 형식 |
| tenantId | string | 테넌트 ID |

### 8.2 작업 상세

```http
GET /jobs/:id
```

### 8.3 작업 생성

```http
POST /jobs
```

**요청**
```json
{
  "targetDate": "2025-01-18",
  "tenantId": "tenant-a",
  "sampleSize": 100,
  "promptTemplateId": "template-uuid"
}
```

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|-------|------|
| targetDate | string | O | - | 분석 대상 날짜 |
| tenantId | string | X | null | 특정 테넌트 (null=전체) |
| sampleSize | number | X | 100 | 샘플 크기 (10~500) |
| promptTemplateId | string | X | null | 프롬프트 템플릿 (null=기본) |

### 8.4 작업 실행

```http
POST /jobs/:id/run
```

### 8.5 작업 삭제

```http
DELETE /jobs/:id
```

### 8.6 결과 목록

```http
GET /results?jobId=uuid&minAvgScore=5&maxAvgScore=10&sentiment=negative&hasIssues=true
```

**쿼리 파라미터**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| jobId | string | 작업 ID |
| minAvgScore | number | 최소 평균 점수 |
| maxAvgScore | number | 최대 평균 점수 |
| sentiment | string | positive, neutral, negative |
| hasIssues | boolean | 이슈 존재 여부 |

### 8.7 결과 상세

```http
GET /results/:id
```

**응답**
```json
{
  "id": "uuid",
  "jobId": "uuid",
  "originalTimestamp": "2025-01-18T14:30:00Z",
  "tenantId": "tenant-a",
  "sessionId": "session-123",
  "userInput": "배송은 언제 오나요?",
  "llmResponse": "주문하신 상품은 내일 도착 예정입니다...",
  "qualityScore": 8,
  "relevance": 9,
  "completeness": 7,
  "clarity": 8,
  "avgScore": 8.0,
  "sentiment": "neutral",
  "issues": ["배송 추적 링크 미제공"],
  "improvements": ["추적 URL 포함 권장"],
  "modelName": "gemini-2.0-flash",
  "inputTokens": 120,
  "outputTokens": 350,
  "latencyMs": 1100
}
```

### 8.8 프롬프트 템플릿

```http
GET /prompts
GET /prompts/:id
POST /prompts
PUT /prompts/:id
DELETE /prompts/:id
```

**생성 요청**
```json
{
  "name": "상세 품질 분석",
  "description": "응답 품질을 상세히 분석하는 프롬프트",
  "prompt": "다음 대화를 분석해주세요:\n\n사용자 질문: {{user_input}}\nAI 응답: {{llm_response}}\n\n다음 형식으로 JSON 응답해주세요:\n{...}",
  "isDefault": false
}
```

### 8.9 스케줄 관리

```http
GET /schedules
GET /schedules/:id
POST /schedules
PUT /schedules/:id
DELETE /schedules/:id
POST /schedules/:id/toggle
```

**생성 요청**
```json
{
  "name": "매일 오전 분석",
  "isEnabled": true,
  "hour": 2,
  "minute": 0,
  "daysOfWeek": "1,2,3,4,5",
  "timeZone": "Asia/Seoul",
  "targetTenantId": null,
  "sampleSize": 100,
  "promptTemplateId": null
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| hour | number | 실행 시간 (0-23) |
| minute | number | 실행 분 (0-59) |
| daysOfWeek | string | 쉼표 구분 (0=일요일, 6=토요일) |
| timeZone | string | 타임존 (기본: Asia/Seoul) |

### 8.10 이슈 빈도

```http
GET /issue-frequency?limit=10&days=30
```

**응답**
```json
[
  {
    "issue": "배송 추적 링크 미제공",
    "count": 45,
    "percentage": 15.5
  },
  {
    "issue": "응답이 너무 짧음",
    "count": 32,
    "percentage": 11.0
  }
]
```

### 8.11 통계

```http
GET /stats
```

**응답**
```json
{
  "totalJobs": 120,
  "completedJobs": 115,
  "failedJobs": 5,
  "totalResults": 11500,
  "avgQualityScore": 7.8
}
```

### 8.12 테넌트 목록

```http
GET /tenants?days=30
```

---

## 9. Chatbot API

**Base Path**: `/api/chatbot`
**필요 권한**: JWT 인증 필요

### 9.1 메시지 전송

```http
POST /chat
```

**요청**
```json
{
  "message": "현재 에러율이 어때?",
  "pageContext": "/dashboard/quality",
  "sessionId": "session-uuid"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| message | string | O | 사용자 메시지 |
| pageContext | string | O | 현재 페이지 경로 |
| sessionId | string | X | 기존 세션 ID (없으면 새로 생성) |

**응답**
```json
{
  "userMessage": {
    "role": "user",
    "content": "현재 에러율이 어때?",
    "timestamp": "2025-01-19T10:00:00Z"
  },
  "assistantMessage": {
    "role": "assistant",
    "content": "## 에러율 현황\n\n현재 에러율은 2.5%로...",
    "metadata": {
      "pageContext": "/dashboard/quality",
      "model": "gemini-2.0-flash",
      "inputTokens": 180,
      "outputTokens": 420,
      "latencyMs": 1350
    },
    "timestamp": "2025-01-19T10:00:02Z"
  },
  "sessionId": "session-uuid"
}
```

### 9.2 세션 조회

```http
GET /sessions/:sessionId
```

### 9.3 세션 삭제

```http
DELETE /sessions/:sessionId
```

---

## 10. Anomaly API

**Base Path**: `/projects/:projectId/ml/anomaly`

인증 없이 접근 가능한 공개 API입니다.

### 10.1 종합 이상 탐지

```http
GET /detect
```

**응답**
```json
{
  "tokenAnomalies": [...],
  "errorAnomalies": [...],
  "trafficAnomalies": [...]
}
```

### 10.2 토큰 이상 탐지

```http
GET /tokens
```

### 10.3 에러율 이상 탐지

```http
GET /errors?threshold=10
```

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| threshold | number | 10 | 에러율 임계치 (%) |

### 10.4 트래픽 이상 탐지

```http
GET /traffic
```

---

## 관련 문서

- [시스템 아키텍처](./03-architecture.md) - 기술 구조
- [데이터베이스 스키마](./05-database-schema.md) - DB 구조
- [데이터 흐름도](./06-data-flow.md) - 시스템 동작
