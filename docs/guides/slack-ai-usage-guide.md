# Slack 알림 & AI 분석 기능 사용 가이드

> 작성일: 2026-01-16

## 개요

이 문서는 OLA B2B Monitoring 시스템의 두 가지 핵심 기능에 대한 상세 사용 가이드입니다:

1. **Slack 알림 시스템**: 실시간 모니터링 알림 전송
2. **AI (Gemini) 분석 시스템**: LLM 기반 메트릭 분석 채팅

---

## 1. Slack 알림 시스템

### 1.1 환경 변수 설정

Backend `.env` 파일에 다음 변수를 설정합니다:

```env
# Slack Webhook URL (필수 - 기본 알림용)
SLACK_WEBHOOK_URL=<your-slack-webhook-url>

# Slack Bot Token (선택 - 고급 기능용)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# 기본 알림 채널 (선택, 기본값: #alerts)
SLACK_DEFAULT_CHANNEL=#alerts
```

**참고**: Webhook URL 또는 Bot Token 중 하나만 설정해도 알림이 작동합니다.

### 1.2 Slack Webhook 설정 방법

1. [Slack API](https://api.slack.com/apps) 접속
2. "Create New App" → "From scratch" 선택
3. App 이름 입력 (예: "OLA Monitoring") 후 워크스페이스 선택
4. 좌측 메뉴에서 "Incoming Webhooks" 클릭
5. "Activate Incoming Webhooks" 토글 ON
6. "Add New Webhook to Workspace" 클릭
7. 알림을 받을 채널 선택 후 "Allow"
8. 생성된 Webhook URL을 `.env`에 설정

### 1.3 알림 서비스 API

#### SlackNotificationService 메서드

| 메서드 | 용도 |
|--------|------|
| `sendAlert()` | 일반 알림 전송 |
| `sendFrustrationAlert()` | 불만 고객 탐지 알림 |
| `sendNewPatternAlert()` | 신규 질문 패턴 알림 |
| `isNotificationEnabled()` | 알림 활성화 상태 확인 |

#### 일반 알림 (sendAlert)

```typescript
import { SlackNotificationService } from '@/notifications/slack-notification.service';

// Injection
constructor(private slackService: SlackNotificationService) {}

// 사용
await this.slackService.sendAlert({
  title: '이상 탐지 알림',
  message: '비정상적인 에러율이 감지되었습니다.',
  severity: 'warning',  // 'info' | 'warning' | 'critical'
  fields: [
    { name: '에러율', value: '15.5%' },
    { name: '테넌트', value: 'tenant_acme' },
    { name: '시간', value: '2026-01-16 14:30 KST' },
  ],
  channel: '#monitoring',  // 선택 (기본값: SLACK_DEFAULT_CHANNEL)
});
```

#### 불만 고객 알림 (sendFrustrationAlert)

```typescript
await this.slackService.sendFrustrationAlert({
  userId: 'user_123',
  tenantId: 'tenant_acme',
  frustrationLevel: 0.85,  // 0~1 범위 (0.8 이상 = critical)
  recentQueries: [
    '왜 안되는거야?',
    '도대체 뭐가 문제야',
    '환불해줘!!!',
  ],
  timestamp: new Date().toISOString(),
});
```

알림 심각도는 `frustrationLevel`에 따라 자동 결정됩니다:
- 0.8 이상: `critical` (빨간색)
- 0.8 미만: `warning` (주황색)

#### 신규 패턴 알림 (sendNewPatternAlert)

```typescript
await this.slackService.sendNewPatternAlert({
  pattern: '환불 요청',
  recentCount: 50,
  isNew: true,        // 신규 여부
  firstSeen: '2026-01-10T00:00:00Z',
});
```

알림 심각도는 `recentCount`에 따라 자동 결정됩니다:
- 50 초과: `warning`
- 50 이하: `info`

### 1.4 알림 심각도 색상

| 심각도 | 색상 | 이모지 | 사용 시나리오 |
|--------|------|--------|---------------|
| `info` | 파란색 (#2196F3) | :information_source: | 정보성 알림, 일반 모니터링 |
| `warning` | 주황색 (#FF9800) | :warning: | 주의 필요, 불만 고객 탐지 |
| `critical` | 빨간색 (#F44336) | :rotating_light: | 긴급 대응 필요, 시스템 장애 |

### 1.5 알림 서비스 상태 확인

```typescript
// 알림 활성화 여부 확인
if (this.slackService.isNotificationEnabled()) {
  await this.slackService.sendAlert({ ... });
} else {
  this.logger.warn('Slack notifications are disabled');
}
```

---

## 2. AI (Gemini) 분석 시스템

### 2.1 환경 변수 설정

Backend `.env` 파일에 다음 변수를 설정합니다:

```env
# LLM Provider 선택 (기본값: gemini)
LLM_PROVIDER=gemini

# Google Gemini API 키 (필수)
GOOGLE_GEMINI_API_KEY=AIzaSy...your-api-key-here

# Gemini 모델 선택 (선택, 기본값: gemini-1.5-flash)
GEMINI_MODEL=gemini-1.5-flash
```

**지원 모델:**
- `gemini-1.5-flash` (기본, 빠른 응답)
- `gemini-1.5-pro` (고품질 분석)

### 2.2 Gemini API 키 발급 방법

1. [Google AI Studio](https://aistudio.google.com/) 접속
2. Google 계정으로 로그인
3. 좌측 메뉴에서 "Get API key" 클릭
4. "Create API key" 버튼 클릭
5. 프로젝트 선택 또는 새 프로젝트 생성
6. 생성된 API 키를 `.env`에 설정

### 2.3 대시보드 UI 사용법

#### 접근 경로

```
http://localhost:3001/dashboard/admin/analysis
```

**필요 권한:** `analysis:read`, `analysis:write`

#### 기본 사용 흐름

1. **세션 생성**
   - "New Session" 버튼 클릭
   - 세션 제목 입력 (예: "Weekly Usage Analysis")
   - 선택적으로 프로젝트 컨텍스트 설정

2. **채팅으로 분석 요청**
   - 채팅창에 질문 입력
   - AI가 현재 메트릭 데이터를 참조하여 분석 응답
   - 대화 히스토리가 유지됨

3. **분석 예시 질문**
   - "지난 7일간 사용량이 가장 높은 테넌트는?"
   - "비정상적인 에러 패턴이 있는지 분석해줘"
   - "토큰 효율성을 개선할 방법을 제안해줘"
   - "비용 추이에서 이상 징후가 있어?"

### 2.4 API 엔드포인트

모든 API는 JWT 인증이 필요합니다.

#### 세션 생성

```bash
POST /api/admin/analysis/sessions
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Weekly Usage Analysis",
  "context": {
    "projectId": "my-project",
    "dateRange": "7d"
  }
}
```

**응답:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "title": "Weekly Usage Analysis",
  "context": { "projectId": "my-project", "dateRange": "7d" },
  "createdAt": "2026-01-16T10:00:00Z",
  "updatedAt": "2026-01-16T10:00:00Z"
}
```

#### 세션 목록 조회

```bash
GET /api/admin/analysis/sessions?page=1&pageSize=20
Authorization: Bearer <jwt-token>
```

**응답:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-123",
      "title": "Weekly Usage Analysis",
      "context": {},
      "createdAt": "2026-01-16T10:00:00Z",
      "updatedAt": "2026-01-16T10:30:00Z",
      "_count": { "messages": 5 }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### 세션 상세 조회 (메시지 포함)

```bash
GET /api/admin/analysis/sessions/:sessionId
Authorization: Bearer <jwt-token>
```

**응답:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "title": "Weekly Usage Analysis",
  "context": {},
  "createdAt": "2026-01-16T10:00:00Z",
  "updatedAt": "2026-01-16T10:30:00Z",
  "messages": [
    {
      "id": "msg-001",
      "role": "user",
      "content": "What are the top 5 tenants?",
      "metadata": {},
      "createdAt": "2026-01-16T10:00:00Z"
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "content": "Based on the current metrics...",
      "metadata": {
        "inputTokens": 150,
        "outputTokens": 250,
        "model": "gemini-1.5-flash",
        "latencyMs": 1234
      },
      "createdAt": "2026-01-16T10:00:05Z"
    }
  ]
}
```

#### 메시지 전송 (채팅)

```bash
POST /api/admin/analysis/sessions/:sessionId/chat
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "message": "지난 주 대비 사용량 변화를 분석해줘"
}
```

**응답:**
```json
{
  "userMessage": {
    "id": "msg-003",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "role": "user",
    "content": "지난 주 대비 사용량 변화를 분석해줘",
    "metadata": {},
    "createdAt": "2026-01-16T10:05:00Z"
  },
  "assistantMessage": {
    "id": "msg-004",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "role": "assistant",
    "content": "지난 주 대비 사용량 변화를 분석해보겠습니다...",
    "metadata": {
      "inputTokens": 180,
      "outputTokens": 320,
      "model": "gemini-1.5-flash",
      "latencyMs": 1456
    },
    "createdAt": "2026-01-16T10:05:02Z"
  },
  "metadata": {
    "inputTokens": 180,
    "outputTokens": 320,
    "model": "gemini-1.5-flash",
    "latencyMs": 1456
  }
}
```

#### 세션 삭제

```bash
DELETE /api/admin/analysis/sessions/:sessionId
Authorization: Bearer <jwt-token>
```

**응답:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

### 2.5 권한 설정

AI 분석 기능을 사용하려면 다음 권한이 필요합니다:

| 권한 | 설명 |
|------|------|
| `analysis:read` | 세션 목록/상세 조회 |
| `analysis:write` | 세션 생성, 메시지 전송, 세션 삭제 |

Admin 대시보드의 역할 관리 페이지에서 사용자에게 권한을 부여할 수 있습니다.

### 2.6 코드에서 직접 사용

```typescript
import { LLMService } from '@/admin/analysis/llm/llm.service';

// Injection
constructor(private llmService: LLMService) {}

// Provider 상태 확인
const providerName = this.llmService.getProviderName();  // 'gemini'
const isConfigured = this.llmService.isProviderConfigured();

// 분석 요청
const response = await this.llmService.generateAnalysis(
  [
    { role: 'user', content: 'What are the anomalies today?' },
  ],
  {
    realtimeKPIs: { totalRequests: 1500, successRate: 0.95 },
    tenantUsage: [{ tenantId: 'acme', totalRequests: 500 }],
    anomalies: [{ type: 'error_spike', description: 'Error rate above threshold' }],
  }
);

console.log(response);
// {
//   content: "Based on the metrics provided...",
//   inputTokens: 150,
//   outputTokens: 280,
//   model: "gemini-1.5-flash",
//   latencyMs: 1234
// }
```

---

## 3. 기타 LLM Provider 지원

시스템은 Gemini 외에도 OpenAI와 Anthropic을 지원합니다.

### 3.1 OpenAI 설정

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...your-openai-key
OPENAI_MODEL=gpt-4o-mini  # 선택
```

### 3.2 Anthropic (Claude) 설정

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...your-anthropic-key
ANTHROPIC_MODEL=claude-3-haiku-20240307  # 선택
```

**참고:** Provider가 설정되지 않은 경우 기본적으로 Gemini로 fallback됩니다.

---

## 4. 문제 해결

### Slack 알림이 전송되지 않음

1. 환경 변수 확인:
   ```bash
   # .env 파일에서 확인
   grep SLACK .env
   ```

2. 서버 시작 로그 확인:
   ```
   [SlackNotificationService] Slack notification service initialized successfully
   # 또는
   [SlackNotificationService] Slack notification service disabled: No SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN configured
   ```

3. Webhook URL 테스트:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test message"}' \
     YOUR_WEBHOOK_URL
   ```

### AI 분석이 작동하지 않음

1. API 키 확인:
   ```bash
   grep GOOGLE_GEMINI_API_KEY .env
   ```

2. 서버 시작 로그 확인:
   ```
   [GeminiProvider] Gemini provider initialized with model: gemini-1.5-flash
   # 또는
   [GeminiProvider] GOOGLE_GEMINI_API_KEY not configured. Gemini provider will not be available.
   ```

3. API 키 유효성 테스트:
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
   ```

### 권한 오류 (403 Forbidden)

Admin 대시보드에서 사용자에게 `analysis:read`, `analysis:write` 권한을 부여했는지 확인하세요.

---

## 5. 관련 파일 목록

### Backend

| 파일 | 설명 |
|------|------|
| `src/notifications/slack-notification.service.ts` | Slack 알림 서비스 |
| `src/admin/analysis/analysis.controller.ts` | AI 분석 API 컨트롤러 |
| `src/admin/analysis/analysis.service.ts` | AI 분석 비즈니스 로직 |
| `src/admin/analysis/llm/llm.service.ts` | LLM Provider 관리 |
| `src/admin/analysis/llm/providers/gemini.provider.ts` | Gemini 구현체 |
| `src/admin/analysis/llm/providers/openai.provider.ts` | OpenAI 구현체 |
| `src/admin/analysis/llm/providers/anthropic.provider.ts` | Anthropic 구현체 |

### Frontend

| 파일 | 설명 |
|------|------|
| `src/app/dashboard/admin/analysis/page.tsx` | AI 분석 대시보드 페이지 |
