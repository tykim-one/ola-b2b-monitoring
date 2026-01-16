# 챗봇 품질 모니터링 시스템 사용 가이드

> 작성일: 2026-01-16

## 개요

챗봇 성능 분석 및 개선을 위한 모니터링 시스템입니다. 다음 기능을 제공합니다:

1. **신규 질문 탐지**: 이전에 없었던 새로운 유형의 질문 탐지
2. **감정 분석**: 불만/공격적 질문 탐지 (키워드 기반)
3. **재질문 패턴 탐지**: 세션 내 유사 질문 반복 탐지 (불만족 신호)
4. **Slack 실시간 알림**: 불만 고객 및 신규 패턴 알림

---

## 1. 환경 변수 설정

### Backend (.env)

```env
# 기존 설정 (BigQuery 등)
GCP_PROJECT_ID=your-project-id
BIGQUERY_DATASET=your_dataset
BIGQUERY_TABLE=logs

# Slack 알림 설정 (선택)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_BOT_TOKEN=xoxb-your-bot-token  # 선택 (고급 기능용)
SLACK_DEFAULT_CHANNEL=#alerts        # 기본 채널
```

### Slack Webhook 설정 방법

1. [Slack API](https://api.slack.com/apps) 접속
2. "Create New App" → "From scratch" 선택
3. App 이름 입력 후 워크스페이스 선택
4. "Incoming Webhooks" 활성화
5. "Add New Webhook to Workspace" 클릭
6. 채널 선택 후 Webhook URL 복사
7. `.env`의 `SLACK_WEBHOOK_URL`에 설정

---

## 2. API 엔드포인트

모든 엔드포인트는 `/projects/:projectId/api/quality/` 경로 하위에 있습니다.

### 신규/급증 질문 패턴

```bash
GET /projects/default/api/quality/emerging-patterns?recentDays=7&historicalDays=90
```

**응답 예시:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "normalizedQuery": "환불 어떻게 하나요",
      "recentCount": 45,
      "historicalCount": 0,
      "patternType": "NEW",
      "growthRate": null,
      "firstSeen": "2026-01-10T09:00:00Z",
      "lastSeen": "2026-01-16T14:30:00Z"
    },
    {
      "normalizedQuery": "배송 언제 오나요",
      "recentCount": 120,
      "historicalCount": 30,
      "patternType": "EMERGING",
      "growthRate": 4.0,
      "firstSeen": "2025-11-01T00:00:00Z",
      "lastSeen": "2026-01-16T15:00:00Z"
    }
  ]
}
```

### 감정/불만 분석

```bash
GET /projects/default/api/quality/sentiment?days=7
```

**응답 예시:**
```json
{
  "success": true,
  "count": 23,
  "data": [
    {
      "timestamp": "2026-01-16T14:25:00Z",
      "tenantId": "tenant_a",
      "userId": "user123",
      "userInput": "도대체 왜 안되는거야!!!",
      "sentimentFlag": "FRUSTRATED",
      "frustrationKeywords": ["도대체", "왜"],
      "success": false,
      "sessionId": "sess_abc123"
    }
  ]
}
```

**sentimentFlag 값:**
- `FRUSTRATED`: 불만 키워드 포함 (환불, 최악, 짜증 등)
- `EMOTIONAL`: 감정 표현 패턴 (ㅠㅠ, !!!, ???)
- `URGENT`: 긴급 키워드 (급해, 빨리, urgent)

### 재질문 패턴 (불만족 신호)

```bash
GET /projects/default/api/quality/rephrased-queries?days=7
```

**응답 예시:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "sessionId": "sess_xyz789",
      "tenantId": "tenant_b",
      "userId": "user456",
      "queryCount": 5,
      "uniqueQueries": 2,
      "similarityScore": 0.6,
      "queries": [
        "배송 언제 와요?",
        "배송 조회 어떻게 해요",
        "내 배송 어디있어요",
        "배송 왜 안와요",
        "배송 확인 방법"
      ],
      "timestamps": ["...", "...", "...", "...", "..."],
      "hasResolution": false
    }
  ]
}
```

### 세션 분석

```bash
GET /projects/default/api/quality/sessions?days=7
```

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "sess_abc",
      "tenantId": "tenant_a",
      "turnCount": 4,
      "successCount": 3,
      "failCount": 1,
      "sessionSuccessRate": 75.0,
      "sessionStart": "2026-01-16T10:00:00Z",
      "sessionEnd": "2026-01-16T10:15:00Z",
      "durationMinutes": 15.0,
      "hasFrustration": true
    }
  ]
}
```

### 테넌트별 품질 요약

```bash
GET /projects/default/api/quality/tenant-summary?days=7
```

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "tenantId": "tenant_a",
      "totalSessions": 1500,
      "avgTurnsPerSession": 3.2,
      "sessionSuccessRate": 85.5,
      "singleTurnRate": 45.0,
      "frustratedSessionCount": 75,
      "frustrationRate": 5.0,
      "avgSessionDurationMinutes": 8.5
    }
  ]
}
```

### 응답 품질 지표

```bash
GET /projects/default/api/quality/response-metrics?days=30
```

---

## 3. Slack 알림 사용법

### 코드에서 알림 전송

```typescript
import { SlackNotificationService } from '../notifications';

@Injectable()
export class YourService {
  constructor(private slackService: SlackNotificationService) {}

  async checkAndAlert() {
    // 기본 알림
    await this.slackService.sendAlert({
      title: '이상 탐지 알림',
      message: '비정상적인 에러율이 감지되었습니다.',
      severity: 'warning',
      fields: [
        { name: '에러율', value: '15%' },
        { name: '테넌트', value: 'tenant_a' },
      ],
    });

    // 불만 고객 알림
    await this.slackService.sendFrustrationAlert({
      userId: 'user123',
      tenantId: 'tenant_a',
      frustrationLevel: 0.85,
      recentQueries: [
        '왜 안돼요?',
        '도대체 뭐가 문제야',
        '환불 어떻게 해요',
      ],
      timestamp: new Date().toISOString(),
    });

    // 신규 패턴 알림
    await this.slackService.sendNewPatternAlert({
      pattern: '환불 요청',
      recentCount: 50,
      isNew: true,
      firstSeen: '2026-01-10T00:00:00Z',
    });
  }
}
```

### 알림 심각도 레벨

| Level | 색상 | 사용 시나리오 |
|-------|------|---------------|
| `info` | 파란색 | 정보성 알림, 일반 모니터링 |
| `warning` | 주황색 | 주의 필요, 불만 고객 탐지 |
| `critical` | 빨간색 | 긴급 대응 필요, 시스템 장애 |

---

## 4. 감정 분석 서비스 사용법

### 단일 텍스트 분석

```typescript
import { SentimentAnalysisService } from '../quality';

const sentimentService = new SentimentAnalysisService();

const result = sentimentService.analyzeSentiment('도대체 왜 안되는거야!!!');
console.log(result);
// {
//   frustrationLevel: 0.75,
//   urgencyLevel: 0.3,
//   formalityLevel: 0.2,
//   isComplaint: true,
//   detectedKeywords: ['도대체', '왜'],
//   emotionalPatterns: ['!!!']
// }
```

### 대화 분석

```typescript
const messages = [
  { content: '배송 언제 오나요?', timestamp: '...', isUser: true },
  { content: '죄송합니다...', timestamp: '...', isUser: false },
  { content: '왜 이렇게 오래 걸려요?', timestamp: '...', isUser: true },
  { content: '확인해드리겠습니다.', timestamp: '...', isUser: false },
  { content: '도대체 언제까지 기다려야해요!!!', timestamp: '...', isUser: true },
];

const analysis = sentimentService.analyzeConversation(messages);
console.log(analysis);
// {
//   overallFrustration: 0.65,
//   frustrationTrend: 'increasing',
//   peakFrustrationIndex: 4,
//   alertRequired: true
// }
```

### 불만 탐지 및 액션 추천

```typescript
const detection = sentimentService.detectFrustration('user123', [
  '왜 안돼요?',
  '이상해요 진짜',
  '환불해주세요!!!',
]);

console.log(detection);
// {
//   userId: 'user123',
//   isFrustrated: true,
//   frustrationScore: 0.8,
//   triggerReasons: ['High frustration keywords', 'Multiple complaints'],
//   recommendedAction: 'escalate'
// }
```

**recommendedAction 값:**
- `monitor`: 관찰 필요 (0.3-0.5)
- `alert`: 알림 전송 (0.5-0.7)
- `escalate`: 담당자 에스컬레이션 (0.7+)

---

## 5. 자동 알림 설정 예시

### 스케줄러 기반 자동 모니터링

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from '../metrics/metrics.service';
import { SlackNotificationService } from '../notifications';
import { SentimentAnalysisService } from '../quality';

@Injectable()
export class QualityMonitoringScheduler {
  constructor(
    private metricsService: MetricsService,
    private slackService: SlackNotificationService,
    private sentimentService: SentimentAnalysisService,
  ) {}

  // 5분마다 불만 고객 체크
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkFrustratedUsers() {
    const sentimentData = await this.metricsService.getSentimentAnalysis(1); // 최근 1일

    const criticalFrustrations = sentimentData.filter(
      (d) => d.sentimentFlag === 'FRUSTRATED'
    );

    if (criticalFrustrations.length > 10) {
      await this.slackService.sendAlert({
        title: '불만 고객 급증 알림',
        message: `최근 24시간 내 ${criticalFrustrations.length}건의 불만 질문이 탐지되었습니다.`,
        severity: 'critical',
        fields: [
          { name: '불만 건수', value: `${criticalFrustrations.length}건` },
        ],
      });
    }
  }

  // 1시간마다 신규 패턴 체크
  @Cron(CronExpression.EVERY_HOUR)
  async checkNewPatterns() {
    const patterns = await this.metricsService.getEmergingQueryPatterns(1, 30);

    const newPatterns = patterns.filter((p) => p.patternType === 'NEW');

    for (const pattern of newPatterns.slice(0, 5)) {
      await this.slackService.sendNewPatternAlert({
        pattern: pattern.normalizedQuery,
        recentCount: pattern.recentCount,
        isNew: true,
        firstSeen: pattern.firstSeen,
      });
    }
  }
}
```

---

## 6. 프론트엔드 대시보드

### 접근 경로

```
http://localhost:3001/dashboard/chatbot-quality
```

### 대시보드 구성

1. **KPI 카드**
   - 총 불만 질문 수
   - 신규 패턴 수
   - 세션 성공률
   - 불만율

2. **신규 질문 패턴 테이블**
   - 패턴 유형 (NEW/EMERGING) 배지
   - 최근 발생 횟수
   - 성장률

3. **감정 분석 테이블**
   - 감정 플래그 (FRUSTRATED/EMOTIONAL/URGENT)
   - 탐지된 키워드
   - 타임스탬프

4. **재질문 패턴 테이블**
   - 세션 ID
   - 질문 반복 횟수
   - 유사도 점수

5. **테넌트 품질 요약**
   - 테넌트별 불만율
   - 세션 성공률
   - 평균 대화 턴 수

---

## 7. 커스터마이징

### 불만 키워드 추가

`apps/backend/src/quality/sentiment-analysis.service.ts`:

```typescript
private readonly frustrationKeywordsKr = [
  '왜', '도대체', '짜증', '화나', '답답', '이상해',
  '바보', '멍청', '안돼', '못해', '실망', '최악',
  '쓰레기', '환불', '고소', '신고',
  // 추가 키워드
  '짜증나', '열받아', '황당', '어이없어',
];
```

### 알림 임계값 조정

```typescript
private readonly thresholds = {
  frustrationAlert: 0.5,  // 0.5 이상이면 알림
  escalation: 0.7,        // 0.7 이상이면 에스컬레이션
  urgency: 0.6,           // 긴급 임계값
};
```

### BigQuery 쿼리 기간 조정

```typescript
// 기본값 변경
async getSentimentAnalysis(days: number = 14)  // 7 → 14일
```

---

## 8. 문제 해결

### Slack 알림이 전송되지 않음

1. `SLACK_WEBHOOK_URL` 환경 변수 확인
2. Webhook URL이 유효한지 확인
3. 서버 로그에서 에러 메시지 확인

```bash
# 로그 확인
tail -f apps/backend/logs/combined.log | grep -i slack
```

### BigQuery 쿼리 에러

1. `request_metadata.session_id` 필드가 로그에 존재하는지 확인
2. 테이블 스키마에 필요한 필드가 있는지 확인

```sql
-- 필드 존재 확인
SELECT DISTINCT JSON_VALUE(request_metadata, '$.session_id') as session_id
FROM `your_project.your_dataset.logs`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
LIMIT 10;
```

### 타입 에러

shared-types 패키지 재빌드:

```bash
cd packages/shared-types && pnpm build
```

---

## 9. 관련 파일 목록

### Backend
- `apps/backend/src/metrics/queries/metrics.queries.ts` - BigQuery 쿼리
- `apps/backend/src/quality/sentiment-analysis.service.ts` - 감정 분석
- `apps/backend/src/notifications/slack-notification.service.ts` - Slack 알림
- `apps/backend/src/metrics/metrics.controller.ts` - API 엔드포인트

### Frontend
- `apps/frontend-next/src/app/dashboard/chatbot-quality/page.tsx` - 대시보드
- `apps/frontend-next/src/services/chatbotQualityService.ts` - API 클라이언트

### Shared
- `packages/shared-types/src/index.ts` - 타입 정의
