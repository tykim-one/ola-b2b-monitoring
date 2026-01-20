<!-- Parent: ../AGENTS.md -->
# services

## Purpose
외부 API 및 서비스 연동 클라이언트입니다.

## Key Files
- `geminiService.ts` - Google Gemini AI API 연동
- `analysisService.ts` - LLM 분석 세션 관리 API
- `userAnalyticsService.ts` - 유저 분석 API (x_enc_data 기준)
  - `fetchUserRequestCounts()` - 유저별 요청 수 조회
  - `fetchUserTokenUsage()` - 유저별 토큰 사용량 조회
  - `fetchUserQuestionPatterns()` - 유저별 질문 패턴 조회
  - `fetchUserList()` - 유저 목록 (통합 통계) 조회
  - `fetchUserActivity()` - 유저 활동 상세 (대화 이력) 조회
- `chatbotQualityService.ts` - 챗봇 품질 분석 API
  - `getEmergingPatterns()` - 신규/급증 질문 패턴 조회
  - `getSentimentAnalysis()` - 감정/불만 분석 조회
  - `getRephrasedQueries()` - 재질문 패턴 조회
  - `getSessionAnalytics()` - 세션 분석 조회
  - `getTenantQualitySummary()` - 테넌트 품질 요약 조회
  - `getResponseQualityMetrics()` - 응답 품질 지표 조회
- `batchAnalysisService.ts` - 배치 분석 API
  - `batchAnalysisApi.listJobs()` - 작업 목록 조회
  - `batchAnalysisApi.getJob()` - 작업 상세 조회
  - `batchAnalysisApi.createJob()` - 작업 생성
  - `batchAnalysisApi.runJob()` - 작업 실행
  - `batchAnalysisApi.deleteJob()` - 작업 삭제
  - `batchAnalysisApi.listResults()` - 결과 목록 조회 (필터: minAvgScore, maxAvgScore, sentiment, hasIssues)
  - `batchAnalysisApi.getIssueFrequency()` - 이슈 빈도 분석 (가장 빈번한 이슈 집계)
  - `batchAnalysisApi.listPromptTemplates()` - 템플릿 목록
  - `batchAnalysisApi.createPromptTemplate()` - 템플릿 생성
  - `batchAnalysisApi.updatePromptTemplate()` - 템플릿 수정
  - `batchAnalysisApi.deletePromptTemplate()` - 템플릿 삭제
  - `batchAnalysisApi.getStatistics()` - 통계 조회
  - `batchAnalysisApi.listSchedules()` - 스케줄 목록 조회
  - `batchAnalysisApi.createSchedule()` - 스케줄 생성
  - `batchAnalysisApi.updateSchedule()` - 스케줄 수정
  - `batchAnalysisApi.deleteSchedule()` - 스케줄 삭제
  - `batchAnalysisApi.toggleSchedule()` - 스케줄 활성/비활성
  - `batchAnalysisApi.getAvailableTenants()` - 사용 가능한 테넌트 조회
  - **BatchAnalysisResult 타입**: 파싱된 분석 필드 포함
    - `qualityScore`, `relevance`, `completeness`, `clarity` (1-10 점수)
    - `sentiment` (positive/neutral/negative)
    - `summaryText` (한 줄 요약)
    - `issues`, `improvements`, `missingData` (JSON 배열)
    - `issueCount`, `avgScore`

- `faqAnalysisService.ts` - FAQ 분석 API
  - `analyzeFAQs()` - FAQ 클러스터링 분석 실행
  - `getAvailableTenants()` - 테넌트 목록 조회
- `sessionAnalysisService.ts` - 세션 분석 API
  - `getSessionStats()` - 세션 통계 조회 (해결률, 평균 턴 수)
  - `getSessionList()` - 세션 목록 조회 (필터, 페이지네이션)
  - `getSessionTimeline()` - 세션 타임라인 조회
  - `analyzeSessionWithLLM()` - LLM 심층 분석
- `userProfilingService.ts` - 사용자 프로파일링 API
  - `getUserProfile()` - 사용자 프로필 조회
  - `getCategoryDistribution()` - 카테고리 분포 조회
  - `getSentimentAnalysis()` - 감정 분석 결과 조회

## For AI Agents
- API 클라이언트는 이 디렉토리에 추가
- 백엔드 API 호출 시 fetch 또는 axios 사용
- 환경변수로 API URL 설정 (`NEXT_PUBLIC_API_URL`)
