<!-- Parent: ../AGENTS.md -->
# logs

## Purpose
특정 프로젝트의 로그를 탐색하는 페이지입니다.

## Key Files
- `page.tsx` - 로그 뷰어 페이지 (프로젝트별 필터링, 페이지네이션)

## For AI Agents
- 라우트: `/[projectId]/logs`
- LogExplorer 컴포넌트 활용
- 프로젝트 ID 기반 BigQuery 로그 조회
