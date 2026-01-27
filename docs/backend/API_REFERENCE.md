# Backend API Reference

OLA B2B Monitoring 백엔드의 전체 API 엔드포인트 목록입니다. 모든 엔드포인트는 REST API 원칙을 따르며, JSON 형식으로 데이터를 주고받습니다.

## 목차

- [인증 API](#인증-api)
- [메트릭 API](#메트릭-api)
- [분석 API](#분석-api)
- [AI/ML API](#aiml-api)
- [품질 분석 API](#품질-분석-api)
- [유저 분석 API](#유저-분석-api)
- [어드민 API](#어드민-api)
- [배치 분석 API](#배치-분석-api)
- [FAQ 분석 API](#faq-분석-api)
- [세션 분석 API](#세션-분석-api)
- [유저 프로파일링 API](#유저-프로파일링-api)
- [챗봇 API](#챗봇-api)
- [ETL 모니터링 API](#etl-모니터링-api)
- [캐시 관리 API](#캐시-관리-api)

---

## 인증 API

모든 어드민 API는 JWT 토큰이 필요합니다. 로그인 후 Access Token을 `Authorization: Bearer <token>` 헤더에 포함해야 합니다.

### POST /api/admin/auth/login

사용자 로그인 (Access Token 및 Refresh Token 발급)

- **인증**: 불필요 (`@Public`)
- **Request Body**:
  ```json
  {
    "email": "admin@ola.com",
    "password": "admin123"
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@ola.com",
      "name": "Admin User",
      "roles": ["admin"],
      "permissions": ["admin:read", "admin:write"]
    }
  }
  ```
- **쿠키**: `refreshToken` (httpOnly, 7일 유효)

### POST /api/admin/auth/refresh

Access Token 갱신 (Refresh Token 사용)

- **인증**: 불필요 (`@Public`, httpOnly 쿠키 자동 전송)
- **Response**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@ola.com",
      "name": "Admin User"
    }
  }
  ```

### POST /api/admin/auth/logout

로그아웃 (Refresh Token 폐기)

- **인증**: JWT 필수
- **Response**:
  ```json
  {
    "message": "Logout successful"
  }
  ```

---

## 메트릭 API

프로젝트별 메트릭 데이터를 제공합니다. 모든 엔드포인트는 `/projects/:projectId/api/*` 패턴을 따릅니다.

### GET /projects/:projectId/api/metrics/realtime

실시간 KPI 메트릭 (최근 24시간)

- **인증**: 불필요 (`@Public`, Phase 1 하위 호환성)
- **캐시**: SHORT (5분)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "totalRequests": 1234,
      "successRate": 98.5,
      "avgTokens": 450.2,
      "totalCost": 12.34,
      "errorCount": 15
    },
    "cached": true,
    "cacheTTL": "5 minutes"
  }
  ```

### GET /projects/:projectId/api/metrics/hourly

시간별 트래픽 (최근 24시간)

- **인증**: 불필요 (`@Public`)
- **캐시**: MEDIUM (15분)
- **Response**:
  ```json
  {
    "success": true,
    "count": 24,
    "data": [
      {
        "hour": "2025-01-23T10:00:00Z",
        "requests": 123,
        "tokens": 5000,
        "errors": 2
      }
    ]
  }
  ```

### GET /projects/:projectId/api/metrics/daily

일별 트래픽 (최근 30일)

- **인증**: 불필요 (`@Public`)
- **캐시**: MEDIUM (15분)
- **Response**: `hourly`와 동일 형식

### GET /projects/:projectId/api/logs

샘플 로그 조회

- **인증**: 불필요 (`@Public`)
- **Query Parameters**:
  - `limit` (optional): 조회할 로그 수 (기본값: 100)
- **Response**:
  ```json
  {
    "success": true,
    "count": 100,
    "data": [
      {
        "timestamp": "2025-01-23T10:00:00Z",
        "tenant_id": "tenant-123",
        "user_input": "날씨 알려줘",
        "llm_response": "서울의 현재 날씨는...",
        "total_tokens": "450",
        "success": true
      }
    ]
  }
  ```

---

## 분석 API

### GET /projects/:projectId/api/analytics/tenant-usage

테넌트별 사용량

- **인증**: 불필요 (`@Public`)
- **캐시**: MEDIUM (15분)
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)
- **Response**:
  ```json
  {
    "success": true,
    "count": 5,
    "data": [
      {
        "tenant_id": "tenant-123",
        "total_requests": 5000,
        "total_tokens": 200000,
        "success_rate": 98.5
      }
    ]
  }
  ```

### GET /projects/:projectId/api/analytics/heatmap

사용량 히트맵 (요일 x 시간)

- **인증**: 불필요 (`@Public`)
- **캐시**: MEDIUM (15분)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "day_of_week": 1,  // 0=일요일, 1=월요일
        "hour": 10,
        "request_count": 123
      }
    ]
  }
  ```

### GET /projects/:projectId/api/analytics/cost-trend

비용 트렌드 (일별)

- **인증**: 불필요 (`@Public`)
- **캐시**: MEDIUM (15분)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "date": "2025-01-23",
        "total_tokens": 100000,
        "estimated_cost": 10.50
      }
    ]
  }
  ```

### GET /projects/:projectId/api/analytics/errors

에러 분석

- **인증**: 불필요 (`@Public`)
- **캐시**: SHORT (5분)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "tenant_id": "tenant-123",
        "error_count": 15,
        "error_rate": 1.5
      }
    ]
  }
  ```

### GET /projects/:projectId/api/analytics/user-requests

유저별 요청 수

- **인증**: 불필요 (`@Public`)
- **캐시**: MEDIUM (15분)
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)
  - `limit` (optional): 최대 유저 수 (기본값: 50)

### GET /projects/:projectId/api/analytics/user-tokens

유저별 토큰 사용량

- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)
  - `limit` (optional): 최대 유저 수 (기본값: 50)

### GET /projects/:projectId/api/analytics/user-patterns

유저별 질문 패턴

- **Query Parameters**:
  - `userId` (optional): 특정 유저 필터 (x_enc_data)
  - `days` (optional): 조회 기간 (기본값: 7)
  - `limit` (optional): 최대 패턴 수 (기본값: 100)

### GET /projects/:projectId/api/analytics/user-list

유저 목록 (통합 통계)

- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)
  - `limit` (optional): 최대 유저 수 (기본값: 1000)

### GET /projects/:projectId/api/analytics/user-activity/:userId

유저 활동 상세 (대화 이력)

- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)
  - `limit` (optional): 최대 레코드 수 (기본값: 20)
  - `offset` (optional): 페이지네이션 오프셋 (기본값: 0)

---

## AI/ML API

### GET /projects/:projectId/api/ai/token-efficiency

토큰 효율성 분석

- **인증**: 불필요 (`@Public`)
- **캐시**: MEDIUM (15분)
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "date": "2025-01-23",
        "avg_input_tokens": 100,
        "avg_output_tokens": 350,
        "efficiency_ratio": 3.5
      }
    ]
  }
  ```

### GET /projects/:projectId/api/ai/anomaly-stats

이상 탐지용 통계

- **인증**: 불필요 (`@Public`)
- **캐시**: SHORT (5분)
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 30)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "metric": "total_tokens",
        "mean": 450.2,
        "stddev": 120.5,
        "p95": 650.0
      }
    ]
  }
  ```

### GET /projects/:projectId/api/ai/query-patterns

사용자 질의 패턴

- **인증**: 불필요 (`@Public`)
- **캐시**: MEDIUM (15분)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "query_length": 50,
        "avg_tokens": 450,
        "frequency": 123
      }
    ]
  }
  ```

### GET /projects/:projectId/ml/anomaly/detect

종합 이상 탐지 실행

- **Response**:
  ```json
  {
    "success": true,
    "tokenAnomalies": [...],
    "errorAnomalies": [...],
    "trafficAnomalies": [...]
  }
  ```

### GET /projects/:projectId/ml/anomaly/tokens

토큰 사용량 이상 탐지

### GET /projects/:projectId/ml/anomaly/errors

에러율 이상 탐지

- **Query Parameters**:
  - `threshold` (optional): 에러율 임계값 (기본값: 5)

### GET /projects/:projectId/ml/anomaly/traffic

트래픽 스파이크 탐지

---

## 품질 분석 API

### GET /projects/:projectId/api/quality/efficiency-trend

일별 토큰 효율성 트렌드 (최근 30일)

- **인증**: 불필요 (`@Public`)
- **캐시**: MEDIUM (15분)

### GET /projects/:projectId/api/quality/query-response-correlation

질문-응답 길이 상관관계

- **캐시**: MEDIUM (15분)

### GET /projects/:projectId/api/quality/repeated-patterns

반복 질문 패턴 (FAQ 후보)

- **캐시**: MEDIUM (15분)

### GET /projects/:projectId/api/quality/emerging-patterns

신규/급증 질문 패턴

- **Query Parameters**:
  - `recentDays` (optional): 최근 기간 (기본값: 7)
  - `historicalDays` (optional): 비교 기간 (기본값: 90)

### GET /projects/:projectId/api/quality/sentiment

감정/불만 분석

- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

### GET /projects/:projectId/api/quality/rephrased-queries

재질문 패턴 (불만족 신호)

- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

### GET /projects/:projectId/api/quality/sessions

세션별 대화 분석

- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

### GET /projects/:projectId/api/quality/tenant-summary

테넌트별 품질 요약

- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

### GET /projects/:projectId/api/quality/response-metrics

응답 품질 지표

- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 30)

---

## 유저 분석 API

유저 분석 API는 `x_enc_data` 필드를 기준으로 유저를 식별합니다.

### GET /projects/:projectId/api/analytics/user-requests

유저별 요청 수

### GET /projects/:projectId/api/analytics/user-tokens

유저별 토큰 사용량

### GET /projects/:projectId/api/analytics/user-patterns

유저별 질문 패턴

### GET /projects/:projectId/api/analytics/user-list

유저 목록 (통합 통계)

### GET /projects/:projectId/api/analytics/user-activity/:userId

유저 활동 상세

---

## 어드민 API

모든 어드민 API는 JWT 인증 및 권한 검증이 필요합니다.

### Users API

**GET /api/admin/users**
- **권한**: `admin:read`
- **Query Parameters**:
  - `page` (optional): 페이지 번호 (기본값: 1)
  - `pageSize` (optional): 페이지 크기 (기본값: 20)

**GET /api/admin/users/:id**
- **권한**: `admin:read`

**POST /api/admin/users**
- **권한**: `admin:write`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "User Name",
    "roleIds": ["role-uuid-1"]
  }
  ```

**PUT /api/admin/users/:id**
- **권한**: `admin:write`
- **Request Body**: `email`, `name`, `roleIds` (optional)

**DELETE /api/admin/users/:id**
- **권한**: `admin:write`

**POST /api/admin/users/:id/change-password**
- **권한**: `admin:write`
- **Request Body**:
  ```json
  {
    "currentPassword": "old123",
    "newPassword": "new123"
  }
  ```

### Roles API

**GET /api/admin/roles**
- **권한**: `admin:read`

**GET /api/admin/roles/:id**
- **권한**: `admin:read`

**POST /api/admin/roles**
- **권한**: `admin:write`
- **Request Body**:
  ```json
  {
    "name": "analyst",
    "description": "Data Analyst",
    "permissionIds": ["permission-uuid-1"]
  }
  ```

**PUT /api/admin/roles/:id**
- **권한**: `admin:write`

**DELETE /api/admin/roles/:id**
- **권한**: `admin:write`

### Permissions API

**GET /api/admin/permissions**
- **권한**: `admin:read`
- **Response**: 사용 가능한 모든 권한 목록

### Filters API

**GET /api/admin/filters**
- **권한**: `filters:read`
- **Response**: 현재 유저의 저장된 필터 목록

**GET /api/admin/filters/:id**
- **권한**: `filters:read`

**POST /api/admin/filters**
- **권한**: `filters:write`
- **Request Body**:
  ```json
  {
    "name": "My Filter",
    "description": "Description",
    "criteria": "{\"days\": 7, \"tenantId\": \"tenant-123\"}",
    "isDefault": false
  }
  ```

**PUT /api/admin/filters/:id**
- **권한**: `filters:write`

**DELETE /api/admin/filters/:id**
- **권한**: `filters:write`

**POST /api/admin/filters/:id/set-default**
- **권한**: `filters:write`

### Analysis API

**GET /api/admin/analysis/sessions**
- **권한**: `analysis:read`
- **Query Parameters**:
  - `page` (optional): 페이지 번호 (기본값: 1)
  - `pageSize` (optional): 페이지 크기 (기본값: 20)

**GET /api/admin/analysis/sessions/:id**
- **권한**: `analysis:read`

**POST /api/admin/analysis/sessions**
- **권한**: `analysis:write`
- **Request Body**:
  ```json
  {
    "title": "Weekly Usage Analysis",
    "context": "{\"projectId\": \"my-project\"}"
  }
  ```

**POST /api/admin/analysis/sessions/:id/chat**
- **권한**: `analysis:write`
- **Request Body**:
  ```json
  {
    "message": "What are the top 5 tenants?"
  }
  ```
- **Response**:
  ```json
  {
    "userMessage": { ... },
    "assistantMessage": {
      "content": "Based on the current metrics...",
      "metadata": {
        "inputTokens": 150,
        "outputTokens": 250,
        "model": "gemini-1.5-flash",
        "latencyMs": 1234
      }
    }
  }
  ```

**DELETE /api/admin/analysis/sessions/:id**
- **권한**: `analysis:write`

---

## 배치 분석 API

### Jobs API

**GET /api/admin/batch-analysis/jobs**
- **권한**: `analysis:read`
- **Query Parameters**: `status`, `tenantId` (optional)

**GET /api/admin/batch-analysis/jobs/:id**
- **권한**: `analysis:read`

**POST /api/admin/batch-analysis/jobs**
- **권한**: `analysis:write`
- **Request Body**:
  ```json
  {
    "targetDate": "2025-01-23",
    "tenantId": "tenant-123",
    "sampleSize": 100,
    "promptTemplate": "다음 대화의 품질을 평가하세요..."
  }
  ```

**POST /api/admin/batch-analysis/jobs/:id/run**
- **권한**: `analysis:write`

**POST /api/admin/batch-analysis/jobs/:id/cancel**
- **권한**: `analysis:write`

**DELETE /api/admin/batch-analysis/jobs/:id**
- **권한**: `analysis:write`

### Results API

**GET /api/admin/batch-analysis/results**
- **권한**: `analysis:read`
- **Query Parameters**:
  - `jobId` (optional): 특정 작업 필터
  - `minAvgScore` (optional): 최소 평균 점수
  - `maxAvgScore` (optional): 최대 평균 점수
  - `sentiment` (optional): 감정 필터 (positive/neutral/negative)
  - `hasIssues` (optional): 이슈 유무 (true/false)

**GET /api/admin/batch-analysis/results/:id**
- **권한**: `analysis:read`

### Prompts API

**GET /api/admin/batch-analysis/prompts**
- **권한**: `analysis:read`

**POST /api/admin/batch-analysis/prompts**
- **권한**: `analysis:write`
- **Request Body**:
  ```json
  {
    "name": "Quality Evaluation v2",
    "description": "Updated quality prompt",
    "prompt": "Analyze the following conversation...",
    "isDefault": false,
    "isActive": true
  }
  ```

**PUT /api/admin/batch-analysis/prompts/:id**
- **권한**: `analysis:write`

**DELETE /api/admin/batch-analysis/prompts/:id**
- **권한**: `analysis:write`

### Schedule API

**GET /api/admin/batch-analysis/schedules**
- **권한**: `analysis:read`

**POST /api/admin/batch-analysis/schedules**
- **권한**: `analysis:write`
- **Request Body**:
  ```json
  {
    "name": "오전 분석",
    "isEnabled": true,
    "hour": 8,
    "minute": 10,
    "daysOfWeek": "1,2,3,4,5",
    "timeZone": "Asia/Seoul",
    "targetTenantId": null,
    "sampleSize": 100,
    "promptTemplateId": "template-uuid"
  }
  ```

**PUT /api/admin/batch-analysis/schedules/:id**
- **권한**: `analysis:write`

**DELETE /api/admin/batch-analysis/schedules/:id**
- **권한**: `analysis:write`

**POST /api/admin/batch-analysis/schedules/:id/toggle**
- **권한**: `analysis:write`

### Utilities

**GET /api/admin/batch-analysis/issue-frequency**
- **권한**: `analysis:read`
- **Query Parameters**:
  - `topN` (optional): 상위 N개 이슈 (기본값: 20)

**GET /api/admin/batch-analysis/stats**
- **권한**: `analysis:read`

**GET /api/admin/batch-analysis/tenants**
- **권한**: `analysis:read`
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 30)

**POST /api/admin/batch-analysis/migrate-parse-fields**
- **권한**: `analysis:write`

---

## FAQ 분석 API

### POST /api/quality/faq-analysis

FAQ 분석 실행

- **Request Body**:
  ```json
  {
    "tenantId": "tenant-123",
    "periodDays": 7,
    "topN": 10
  }
  ```
- **Response**:
  ```json
  {
    "jobId": "job-uuid",
    "status": "RUNNING",
    "clusters": [
      {
        "rank": 1,
        "representativeQuestion": "배송 조회",
        "frequency": 150,
        "reasonAnalysis": "사용자들이 주문한 상품의 배송 상태를 확인하고 싶어합니다."
      }
    ]
  }
  ```

### GET /api/quality/faq-analysis/tenants

테넌트 목록 조회

- **Query Parameters**:
  - `periodDays` (optional): 조회 기간 (기본값: 30)

### Jobs API

**GET /api/quality/faq-analysis/jobs**
- **Query Parameters**: `status`, `tenantId` (optional)

**GET /api/quality/faq-analysis/jobs/:id**

**POST /api/quality/faq-analysis/jobs**
- **Request Body**:
  ```json
  {
    "tenantId": "tenant-123",
    "periodDays": 7,
    "topN": 10
  }
  ```

**POST /api/quality/faq-analysis/jobs/:id/run**

**DELETE /api/quality/faq-analysis/jobs/:id**

**GET /api/quality/faq-analysis/jobs/:id/results**

---

## 세션 분석 API

### GET /api/admin/session-analysis/stats

세션 통계 (실시간)

- **Query Parameters**:
  - `tenantId` (optional): 테넌트 필터
  - `startDate` (optional): 시작 날짜
  - `endDate` (optional): 종료 날짜
- **Response**:
  ```json
  {
    "totalSessions": 1000,
    "resolvedSessions": 850,
    "resolutionRate": 85.0,
    "avgTurns": 3.5,
    "avgDuration": 120.5
  }
  ```

### GET /api/admin/session-analysis/sessions

세션 목록 (페이지네이션)

- **Query Parameters**:
  - `tenantId` (optional)
  - `startDate` (optional)
  - `endDate` (optional)
  - `page` (optional): 기본값 1
  - `pageSize` (optional): 기본값 20

### GET /api/admin/session-analysis/sessions/:sessionId/timeline

세션 타임라인 (대화 이력)

- **Response**:
  ```json
  {
    "sessionId": "session-123",
    "tenantId": "tenant-123",
    "userId": "user-456",
    "messages": [
      {
        "timestamp": "2025-01-23T10:00:00Z",
        "userInput": "배송 조회",
        "llmResponse": "주문번호를 알려주세요.",
        "tokens": 450
      }
    ],
    "totalTurns": 5,
    "duration": 120.5,
    "resolved": true
  }
  ```

### POST /api/admin/session-analysis/sessions/:sessionId/analyze

세션 LLM 심층 분석

- **Response**:
  ```json
  {
    "sessionId": "session-123",
    "analysis": "이 세션은 사용자가 배송 조회를 요청했으나...",
    "resolutionScore": 8,
    "qualityScore": 9,
    "suggestions": ["배송 조회 FAQ 추가 필요"]
  }
  ```

### GET /api/admin/session-analysis/tenants

테넌트 목록 조회

- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

---

## 유저 프로파일링 API

### GET /api/user-profiling/:userId

유저 프로필 조회

- **인증**: 불필요 (`@Public`)
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)
- **Response**:
  ```json
  {
    "userId": "user-456",
    "tenantId": "tenant-123",
    "frustrationRate": 0.15,
    "aggressiveCount": 2,
    "categoryDistribution": {
      "complaint": 5,
      "product_inquiry": 10
    },
    "behaviorSummary": "주로 배송 관련 문의",
    "totalMessages": 20
  }
  ```

### GET /api/user-profiling/:userId/sentiment

유저 실시간 감정 분석

- **인증**: 불필요 (`@Public`)
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

### GET /api/user-profiling/:userId/categories

유저 카테고리 분포 조회

- **인증**: 불필요 (`@Public`)
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

### Batch Jobs API

**GET /api/user-profiling/jobs**
- **인증**: 불필요 (`@Public`)
- **Query Parameters**:
  - `status` (optional): 작업 상태 필터
  - `limit` (optional): 최대 작업 수 (기본값: 20)

**POST /api/user-profiling/jobs**
- **인증**: 불필요 (`@Public`)
- **Request Body**:
  ```json
  {
    "targetDate": "2025-01-23",
    "tenantId": "tenant-123"
  }
  ```

**POST /api/user-profiling/jobs/:jobId/run**
- **인증**: 불필요 (`@Public`)

---

## 챗봇 API

### POST /api/chatbot/chat

챗봇 메시지 전송 및 AI 응답 수신

- **인증**: JWT 필수
- **Request Body**:
  ```json
  {
    "message": "이 대시보드의 주요 지표는?",
    "pageContext": "/dashboard/business",
    "sessionId": "chatbot-session-123"
  }
  ```
- **Response**:
  ```json
  {
    "message": "이 대시보드는 테넌트별 사용량, 비용 트렌드...",
    "sessionId": "chatbot-session-123"
  }
  ```

### GET /api/chatbot/sessions/:sessionId

챗봇 세션 이력 조회

- **인증**: JWT 필수

### DELETE /api/chatbot/sessions/:sessionId

챗봇 세션 초기화

- **인증**: JWT 필수

---

## ETL 모니터링 API

### Wind ETL API

**GET /api/wind-etl/health**
- **인증**: 불필요 (`@Public`)

**GET /api/wind-etl/runs**
- **Query Parameters**:
  - `limit` (optional): 조회할 레코드 수 (기본값: 50)

**GET /api/wind-etl/summary**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

**GET /api/wind-etl/trend/daily**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 30)

**GET /api/wind-etl/trend/hourly**
- **Query Parameters**:
  - `hours` (optional): 조회 기간 (기본값: 24)

**GET /api/wind-etl/errors**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

**GET /api/wind-etl/stats/files**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 30)

**GET /api/wind-etl/stats/records**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 30)

### Minkabu ETL API

**GET /api/minkabu-etl/health**
- **인증**: 불필요 (`@Public`)

**GET /api/minkabu-etl/runs**
- **Query Parameters**:
  - `limit` (optional): 조회할 레코드 수 (기본값: 50)

**GET /api/minkabu-etl/summary**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

**GET /api/minkabu-etl/trend/daily**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 30)

**GET /api/minkabu-etl/trend/hourly**
- **Query Parameters**:
  - `hours` (optional): 조회 기간 (기본값: 24)

**GET /api/minkabu-etl/errors**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 7)

**GET /api/minkabu-etl/stats/headlines**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 30)

**GET /api/minkabu-etl/stats/index**
- **Query Parameters**:
  - `days` (optional): 조회 기간 (기본값: 30)

---

## 캐시 관리 API

### GET /projects/:projectId/api/cache/stats

캐시 통계 조회

- **인증**: 불필요 (`@Public`)
- **Response**:
  ```json
  {
    "success": true,
    "keys": 15,
    "hits": 1234,
    "misses": 56,
    "hitRate": 95.6
  }
  ```

### DELETE /projects/:projectId/api/cache

전체 캐시 초기화

- **인증**: 불필요 (`@Public`)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Cache flushed successfully"
  }
  ```

---

## 기타 API

### GET /projects/:projectId/api/datasets

BigQuery 데이터셋 목록 조회

- **인증**: 불필요 (`@Public`)

### GET /projects/:projectId/api/tables/:datasetId

BigQuery 테이블 목록 조회

- **인증**: 불필요 (`@Public`)

### POST /projects/:projectId/api/query

BigQuery 커스텀 쿼리 실행

- **인증**: 불필요 (`@Public`)
- **Request Body**:
  ```json
  {
    "sql": "SELECT * FROM `project.dataset.table` LIMIT 10"
  }
  ```

### GET /api/metrics/domain/:domain/summary

도메인별 종합 KPI

- **인증**: 불필요 (`@Public`)
- **Path Parameters**:
  - `domain`: `chatbot` | `report` | `analytics`
- **Response**: 도메인별 집계된 KPI

### GET /api/metrics/global/summary

전체 종합 KPI (모든 프로젝트, 모든 도메인)

- **인증**: 불필요 (`@Public`)

### GET /api/metrics/domains

사용 가능한 도메인 목록

- **인증**: 불필요 (`@Public`)
- **Response**:
  ```json
  {
    "success": true,
    "data": ["chatbot", "report", "analytics"],
    "count": 3
  }
  ```

---

## 에러 응답 형식

모든 API는 일관된 에러 응답 형식을 사용합니다.

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

**주요 HTTP 상태 코드**:
- `200 OK`: 성공
- `201 Created`: 생성 성공
- `204 No Content`: 삭제 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 부족
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 중복 (이메일, 역할명 등)
- `500 Internal Server Error`: 서버 오류

---

## 요약

- **총 엔드포인트 수**: 100개 이상
- **인증 방식**: JWT Bearer Token (Access Token 15분, Refresh Token 7일)
- **권한 형식**: `resource:action` (예: `admin:read`, `analysis:write`)
- **캐싱**: 5분/15분/60분 TTL 전략
- **페이지네이션**: `page`, `pageSize` 쿼리 파라미터 사용
- **필터링**: `days`, `limit`, `tenantId`, `userId` 등 쿼리 파라미터 지원

더 자세한 내용은 다음 문서를 참고하세요:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 백엔드 아키텍처 설계
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Prisma 및 BigQuery 스키마
