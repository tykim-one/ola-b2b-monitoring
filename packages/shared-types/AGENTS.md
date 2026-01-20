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

### 메트릭 타입 (19개)
- **B2BLog** - 기본 로그 타입
- **RealtimeKPI** - 실시간 KPI 메트릭
- **HourlyTraffic, DailyTraffic** - 시간별/일별 트래픽
- **TenantUsage** - 테넌트별 사용량
- **UsageHeatmap** - 사용량 히트맵
- **CostTrend** - 비용 트렌드
- **TokenDistribution** - 토큰 분포
- **TopEndpoint, TopTenant** - Top N 분석
- **ErrorAnalysis** - 에러 분석
- **AnomalyStats, AnomalyLog** - 이상 탐지 타입
- **TokenEfficiency** - 토큰 효율성
- **SuccessRateTrend** - 성공률 트렌드
- **ConversationFlow** - 대화 흐름
- **RepetitivePattern** - 반복 패턴
- **CorrelationPair** - 상관관계
- **ApiResponse** - API 응답 래퍼
- **CacheStats** - 캐시 통계

### 품질 분석 타입 (7개)
- **QualityMetrics** - 품질 메트릭
- **ChatQualityResult** - 챗봇 품질 분석 결과
- **QualityEfficiencyTrend** - 효율성 트렌드
- **QualityCorrelationPair** - 품질 상관관계
- **QualityRepetitivePattern** - 반복 패턴
- **QualityConversationFlow** - 대화 흐름
- **SentimentAnalysisResult** - 감정 분석 결과

### 인증/관리자 타입
- **User, Role, Permission** - 사용자/역할/권한
- **AuthResponse, LoginRequest** - 인증 요청/응답
- **SavedFilter** - 저장된 필터

### 챗봇 타입
- **AnalysisSession, ChatMessage** - 분석 세션 및 메시지
- **CreateAnalysisSessionDto, SendChatMessageDto** - 세션/메시지 DTO

### 배치 분석 타입
- **BatchAnalysisJob, BatchAnalysisResult** - 배치 작업 및 결과
- **IssueFrequency** - 이슈 빈도 분석
- **PromptTemplate** - 프롬프트 템플릿
- **AnalysisSchedule** - 분석 스케줄
