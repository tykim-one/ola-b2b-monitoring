<!-- Parent: ../AGENTS.md -->
# batch-analysis

## Purpose
배치 채팅 품질 분석 관리 페이지입니다. 일일 자동 분석 작업 관리, 결과 조회, 프롬프트 템플릿, 스케줄 관리를 제공합니다.

## Key Files
- `page.tsx` - 배치 분석 작업 목록 및 관리

## Subdirectories
- `[id]/` - 개별 배치 작업 결과 상세
- `components/` - 배치 분석 로컬 컴포넌트
- `prompts/` - 프롬프트 템플릿 관리 페이지
- `schedules/` - 스케줄 관리 페이지
- `issue-frequency/` - 이슈 빈도 분석 페이지
- `faq/` - FAQ 클러스터 상세 페이지

## For AI Agents
- batchAnalysisService를 통해 백엔드 API 호출
- 다중 스케줄 지원, 프롬프트 템플릿 CRUD
