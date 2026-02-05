<!-- Parent: ../AGENTS.md -->
# shared-types

## Purpose
프론트엔드와 백엔드에서 공유하는 TypeScript 타입 정의 패키지입니다. `@ola/shared-types`로 import하여 사용합니다.

## Key Files
- `src/index.ts` - 모든 타입 정의 및 export
- `package.json` - 패키지 설정, 빌드 스크립트
- `tsconfig.json` - TypeScript 컴파일 설정

## Subdirectories
- `src/` - 타입 정의 소스
- `dist/` - 컴파일된 .js 및 .d.ts 파일 (빌드 후 생성)

## For AI Agents
- **빌드**: `pnpm build` (tsc로 dist/ 생성)
- **워치 모드**: `pnpm dev`
- **사용법**: `import { RealtimeKPI, B2BLog } from '@ola/shared-types'`
- 새 타입 추가 시 `src/index.ts`에 export 추가 필요
- 타입 변경 후 반드시 빌드하여 dist/ 갱신
- 빌드 명령어: `cd packages/shared-types && pnpm build`

## Type Categories

### 로그 타입
- **LogLevel** - 로그 레벨 enum (INFO, WARN, ERROR, DEBUG)
- **B2BLog** - 기본 로그 타입

### 메트릭 타입
- **RealtimeKPI** - 실시간 KPI 메트릭
- **HourlyTraffic, DailyTraffic** - 시간별/일별 트래픽
- **TenantUsage** - 테넌트별 사용량
- **UsageHeatmapCell** - 사용량 히트맵 셀
- **CostTrend** - 비용 트렌드
- **ErrorAnalysis** - 에러 분석
- **TokenEfficiency** - 토큰 효율성
- **AnomalyStats** - 이상 탐지 통계
- **QueryPattern** - 쿼리 패턴

### 유저 분석 타입 (x_enc_data 기준)
- **UserRequestCount** - 유저별 요청 수 통계
- **UserTokenUsage** - 유저별 토큰 사용량
- **UserQuestionPattern** - 유저별 질문 패턴
- **UserAnalyticsSummary** - 유저 분석 요약
- **UserListItem** - 유저 목록 아이템 (통합 통계)
- **UserActivityDetail** - 유저 활동 상세

### 품질 분석 타입
- **TokenEfficiencyTrend** - 일별 토큰 효율성 트렌드
- **QueryResponseCorrelation** - 질문-응답 길이 상관관계
- **RepeatedQueryPattern** - 반복 질문 패턴

### 파생 지표/캐시/차트
- **DerivedMetrics** - 파생 지표 (tokenEfficiency, successRate 등)
- **CacheStats** - 캐시 통계
- **ChartConfig** - 차트 설정

### API 응답 타입
- **ApiResponse** - API 응답 래퍼
- **ApiErrorResponse** - API 에러 응답

### 어드민 시스템 - 인증 타입
- **LoginRequest, LoginResponse** - 로그인 요청/응답
- **UserInfo** - 사용자 정보
- **TokenPayload** - JWT 토큰 페이로드
- **RefreshTokenResponse** - 토큰 갱신 응답

### 어드민 시스템 - 사용자 관리 타입
- **User** - 사용자 엔티티
- **CreateUserRequest, UpdateUserRequest** - 사용자 생성/수정 요청
- **ChangePasswordRequest** - 비밀번호 변경 요청

### 어드민 시스템 - 역할/권한 타입
- **Role** - 역할 엔티티
- **Permission** - 권한 엔티티
- **CreateRoleRequest, UpdateRoleRequest** - 역할 생성/수정 요청

### 어드민 시스템 - 필터 타입
- **SavedFilter** - 저장된 필터 엔티티
- **FilterCriteria** - 필터 조건
- **CreateFilterRequest, UpdateFilterRequest** - 필터 생성/수정 요청

### 어드민 시스템 - 분석 세션 타입
- **AnalysisSession** - 분석 세션 엔티티
- **AnalysisContext** - 분석 컨텍스트 (메트릭 스냅샷, 필터)
- **AnalysisMessage** - 분석 메시지 (user/assistant)
- **AnalysisMessageMetadata** - 메시지 메타데이터 (model, tokens, latency)
- **CreateSessionRequest** - 세션 생성 요청
- **SendMessageRequest, SendMessageResponse** - 메시지 전송 요청/응답

### 어드민 시스템 - 기타
- **AuditLog** - 감사 로그
- **PaginatedResponse** - 페이지네이션 응답
- **AdminApiError** - 어드민 API 에러
- **HealthCheckResponse** - 헬스 체크 응답

### 챗봇 품질 분석 타입
- **EmergingQueryPattern** - 신규/급증 질문 패턴
- **SentimentAnalysisResult** - 감정 분석 결과
- **RephrasedQueryPattern** - 재질문 패턴 (동일 세션 내 유사 질문)
- **SessionAnalytics** - 세션 분석 통계
- **TenantQualitySummary** - 테넌트별 품질 요약
- **FrustrationAlert** - 불만 알림 데이터
- **ResponseQualityMetrics** - 응답 품질 지표

### 글로벌 챗봇 타입
- **ChatbotRequest** - 챗봇 요청
- **ChatbotMessage** - 챗봇 메시지
- **ChatbotMessageMetadata** - 메시지 메타데이터
- **ChatbotResponse** - 챗봇 응답
- **ChatbotSession** - 챗봇 세션

### 도메인 집계 타입
- **ServiceDomain** - 서비스 도메인 타입 ('chatbot' | 'report' | 'analytics')
- **ProjectKPI** - 프로젝트별 KPI
- **DomainSummaryKPI** - 도메인별 집계 KPI
- **GlobalSummaryKPI** - 전체 글로벌 KPI

### 문제 채팅 모니터링 타입 - 필드/연산자 레지스트리
- **RuleFieldDataType** - 필드 데이터 타입 ('numeric' | 'text' | 'boolean')
- **RuleFieldDefinition** - 규칙 필드 정의 (field, label, dataType, sqlExpression, requiresCTE)
- **RuleValueType** - 연산자 값 타입 ('number' | 'string' | 'string_array' | 'boolean')
- **RuleOperatorDefinition** - 연산자 정의 (operator, label, sqlTemplate, applicableTo, valueType)
- **RULE_FIELDS** - 사용 가능한 BigQuery 필드 화이트리스트 (상수)
- **RULE_OPERATORS** - 사용 가능한 연산자 목록 (상수)
- **getOperatorsForField()** - 특정 필드에 사용 가능한 연산자 목록 반환
- **getFieldDefinition()** - 필드 정의 조회
- **getOperatorDefinition()** - 연산자 정의 조회

### 문제 채팅 모니터링 타입 - 규칙 config
- **SingleCondition** - 단일 조건 (field, operator, value)
- **CompoundRuleConfig** - 복합 규칙 설정 (v2 - 다중 조건, logic: AND/OR)
- **SimpleRuleConfig** - 단순 규칙 설정 (v1 - 하위 호환)
- **ProblematicChatRuleConfig** - 문제 채팅 필터링 규칙 설정 (통합 타입)
- **isCompoundConfig()** - 복합 규칙인지 판별
- **normalizeToCompound()** - v1 설정을 v2로 정규화

### 문제 채팅 모니터링 타입 - 엔티티
- **ProblematicChatRule** - 문제 채팅 필터링 규칙
- **CreateProblematicChatRuleRequest** - 규칙 생성 요청
- **UpdateProblematicChatRuleRequest** - 규칙 수정 요청
- **ProblematicChat** - 문제 채팅 항목 (timestamp, userInput, llmResponse, matchedRules)
- **ProblematicChatFilter** - 문제 채팅 필터 DTO
- **ProblematicChatRuleStats** - 규칙별 통계
- **ProblematicChatTenantStats** - 테넌트별 통계
- **ProblematicChatStats** - 전체 통계
