<!-- Parent: ../AGENTS.md -->
# batch-analysis

## Purpose
배치 분석 관리 페이지입니다. LLM 기반 채팅 품질 자동 분석, FAQ 클러스터링, 세션 분석 기능을 제공합니다.

## Key Files
- `page.tsx` - 탭 인터페이스 (ChatQualityTab, FAQAnalysisTab, SessionAnalysisTab)
- `[id]/page.tsx` - 작업 상세 페이지 (분석 결과 표시)
- `prompts/page.tsx` - 프롬프트 템플릿 관리 CRUD
- `schedules/page.tsx` - 다중 스케줄 관리 (cron 표현식)
- `faq/[id]/page.tsx` - FAQ 클러스터 상세 페이지
- `issue-frequency/page.tsx` - 이슈 빈도 분석 페이지

## Subdirectories
- `components/` - ChatQualityTab, FAQAnalysisTab, SessionAnalysisTab, CreateJobModal, ScheduleFormModal

## For AI Agents
- **배치 작업**: POST /api/admin/batch-analysis/jobs로 작업 생성, POST /api/admin/batch-analysis/jobs/:id/run으로 실행
- **프롬프트**: LLM 분석에 사용되는 템플릿 (채팅 품질 평가 기준 등)
- **스케줄**: cron 표현식으로 자동 실행 스케줄 관리 (여러 스케줄 동시 운영 가능)
- **필터**: minAvgScore, maxAvgScore, sentiment, hasIssues로 분석 결과 필터링

## Dependencies
- Backend: `/api/admin/batch-analysis/*` (NestJS)
- Shared types: `@ola/shared-types` (BatchAnalysisJob, PromptTemplate, Schedule)
- React Query: 데이터 캐싱 및 자동 갱신
