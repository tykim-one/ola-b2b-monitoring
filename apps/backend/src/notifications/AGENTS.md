<!-- Parent: ../AGENTS.md -->
# Notifications Module

## Purpose
실시간 알림 서비스를 제공합니다. 현재 Slack 알림을 지원하며, 불만 고객 탐지, 신규 패턴 알림 등을 전송합니다.

## Key Files
- `slack-notification.service.ts` - Slack 알림 서비스
- `notifications.module.ts` - NestJS 모듈 정의
- `index.ts` - 모듈 내보내기

## SlackNotificationService

### 환경 변수
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_BOT_TOKEN=xoxb-...  # 선택 (고급 기능용)
SLACK_DEFAULT_CHANNEL=#alerts
```

### 주요 메서드

1. **sendAlert(alert: SlackAlert)**
   - 범용 알림 전송
   - severity: info | warning | critical
   - fields: 추가 정보 배열

2. **sendFrustrationAlert(data: FrustrationAlertData)**
   - 불만 고객 알림 (빨간색)
   - frustrationLevel, recentQueries 포함

3. **sendNewPatternAlert(data: NewPatternAlertData)**
   - 신규 질문 패턴 알림
   - pattern, recentCount, isNew 포함

### 심각도 레벨
| Level | 색상 | 이모지 |
|-------|------|--------|
| info | 파란색 (#36a64f) | :information_source: |
| warning | 주황색 (#ff9800) | :warning: |
| critical | 빨간색 (#dc3545) | :rotating_light: |

### 특징
- Slack Webhook URL 또는 Bot Token 방식 지원
- 설정되지 않은 경우 graceful degradation (로그만 출력)
- Block Kit 기반 리치 메시지 포맷
- 에러 시 애플리케이션 크래시 방지

## For AI Agents
- 알림 채널 추가 시 (Discord, Teams 등) 이 모듈에 새 서비스 추가
- 알림 포맷 커스터마이징은 `buildMessageBlocks` 메서드 수정
- 테스트 시 실제 Slack 채널 대신 테스트 채널 사용 권장

## Dependencies
- @slack/web-api (선택)
- ConfigModule (환경 변수 주입)
