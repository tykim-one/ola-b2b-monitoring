<!-- Parent: ../AGENTS.md -->
# dashboard

## Purpose
모니터링 대시보드 페이지들입니다. 카테고리별로 다른 메트릭 뷰를 제공합니다.

## Key Files
- `page.tsx` - 메인 대시보드 페이지

## Subdirectories
- `ai-performance/` - AI/LLM 성능 메트릭 대시보드
- `business/` - 비즈니스 메트릭 대시보드
- `operations/` - 운영 메트릭 대시보드

## For AI Agents
- 각 서브 대시보드는 독립적인 page.tsx를 가짐
- 차트 컴포넌트는 `src/components/charts/`에서 import
