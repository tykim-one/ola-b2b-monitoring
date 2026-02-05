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
LogLevel, B2BLog

// 메트릭 타입
RealtimeKPI, HourlyTraffic, DailyTraffic, TenantUsage
UsageHeatmapCell, CostTrend, ErrorAnalysis, TokenEfficiency
AnomalyStats, QueryPattern

// 유저 분석 타입 (x_enc_data 기준)
UserRequestCount, UserTokenUsage, UserQuestionPattern
UserAnalyticsSummary, UserListItem, UserActivityDetail

// 품질 분석 타입
TokenEfficiencyTrend, QueryResponseCorrelation, RepeatedQueryPattern

// 파생 지표
DerivedMetrics

// 캐시 통계
CacheStats

// 차트 설정
ChartConfig

// API 응답 타입
ApiResponse, ApiErrorResponse

// 어드민 시스템 - 인증 타입
LoginRequest, LoginResponse, UserInfo, TokenPayload, RefreshTokenResponse

// 어드민 시스템 - 사용자 관리 타입
User, CreateUserRequest, UpdateUserRequest, ChangePasswordRequest

// 어드민 시스템 - 역할/권한 타입
Role, Permission, CreateRoleRequest, UpdateRoleRequest

// 어드민 시스템 - 필터 타입
SavedFilter, FilterCriteria, CreateFilterRequest, UpdateFilterRequest

// 어드민 시스템 - 분석 세션 타입
AnalysisSession, AnalysisContext, AnalysisMessage, AnalysisMessageMetadata
CreateSessionRequest, CreateAnalysisSessionRequest, SendMessageRequest, SendMessageResponse

// 어드민 시스템 - 감사 로그 타입
AuditLog

// 어드민 시스템 - 페이지네이션/에러 타입
PaginatedResponse, AdminApiError

// 어드민 시스템 - 헬스 체크
HealthCheckResponse

// 챗봇 품질 분석 타입
EmergingQueryPattern, SentimentAnalysisResult, RephrasedQueryPattern
SessionAnalytics, TenantQualitySummary, FrustrationAlert, ResponseQualityMetrics

// 글로벌 챗봇 타입
ChatbotRequest, ChatbotMessage, ChatbotMessageMetadata
ChatbotResponse, ChatbotSession

// 도메인 집계 타입
ServiceDomain, ProjectKPI, DomainSummaryKPI, GlobalSummaryKPI

// 문제 채팅 모니터링 타입 - 필드/연산자 레지스트리
RuleFieldDataType, RuleFieldDefinition
RuleValueType, RuleOperatorDefinition
RULE_FIELDS (상수), RULE_OPERATORS (상수)
getOperatorsForField(), getFieldDefinition(), getOperatorDefinition()

// 문제 채팅 모니터링 타입 - 규칙 config
SingleCondition, CompoundRuleConfig, SimpleRuleConfig
ProblematicChatRuleConfig, isCompoundConfig(), normalizeToCompound()

// 문제 채팅 모니터링 타입 - 엔티티
ProblematicChatRule, CreateProblematicChatRuleRequest, UpdateProblematicChatRuleRequest
ProblematicChat, ProblematicChatFilter
ProblematicChatRuleStats, ProblematicChatTenantStats, ProblematicChatStats
```
