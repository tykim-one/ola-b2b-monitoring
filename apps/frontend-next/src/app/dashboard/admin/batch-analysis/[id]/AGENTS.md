<!-- Parent: ../AGENTS.md -->
# [id]

## Purpose
개별 배치 분석 작업의 결과를 상세 조회하는 페이지입니다.

## Key Files
- `page.tsx` - 배치 작업 결과 상세 (점수, 감정 분석, 이슈 목록)

## For AI Agents
- 동적 라우트: `/dashboard/admin/batch-analysis/[id]`
- 필터: minAvgScore, maxAvgScore, sentiment, hasIssues
