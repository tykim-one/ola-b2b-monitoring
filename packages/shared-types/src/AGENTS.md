<!-- Parent: ../AGENTS.md -->
# src

## Purpose
공유 TypeScript 타입 정의 소스입니다. 프론트엔드와 백엔드에서 동일한 타입을 사용합니다.

## Key Files
- `index.ts` - 모든 타입 정의 및 export

## For AI Agents
- 새 타입 추가 시 이 파일에 export
- 변경 후 `pnpm build`로 dist/ 재생성 필요

## Type Categories
```typescript
// 로그 타입
B2BLog, LogLevel

// 메트릭 타입
RealtimeKPI, HourlyTraffic, DailyTraffic

// 분석 타입
TenantUsage, CostTrend, ErrorAnalysis, UsageHeatmapCell

// 유저 분석 타입 (x_enc_data 기준)
UserRequestCount, UserTokenUsage, UserQuestionPattern, UserAnalyticsSummary,
UserListItem, UserActivityDetail

// AI/ML 타입
TokenEfficiency, AnomalyStats, QueryPattern

// API 타입
ApiResponse, ApiErrorResponse, CacheStats

// 설정 타입
ChartConfig, DerivedMetrics

// 어드민/인증 타입
LoginRequest, LoginResponse, UserInfo, TokenPayload, User, Role, Permission
SavedFilter, FilterCriteria, AnalysisSession, AnalysisMessage

// 글로벌 챗봇 타입
ChatbotRequest, ChatbotMessage, ChatbotResponse, ChatbotSession

// 도메인 집계 타입
ServiceDomain, ProjectKPI, DomainSummaryKPI, GlobalSummaryKPI

// 문제 채팅 모니터링 타입
ProblematicChatRuleType, TokenOperator, KeywordMatchField
ProblematicChatRuleConfig, ProblematicChatRule
ProblematicChat, ProblematicChatFilter, ProblematicChatStats
```
