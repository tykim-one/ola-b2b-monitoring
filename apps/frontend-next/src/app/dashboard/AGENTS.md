<!-- Parent: ../AGENTS.md -->
# dashboard

## Purpose
모니터링 대시보드 페이지들입니다. 카테고리별로 다른 메트릭 뷰를 제공합니다.

## Key Files
- `page.tsx` - 메인 대시보드 페이지

## Subdirectories
- `admin/` - 관리자 기능 (사용자 관리, 역할 관리, 필터 관리, AI 분석)
- `ai-performance/` - AI/LLM 성능 메트릭 대시보드
- `business/` - 비즈니스 메트릭 대시보드
- `operations/` - 운영 메트릭 대시보드
- `quality/` - 품질 모니터링 대시보드 (토큰 효율성, 질문-응답 상관관계, FAQ 후보)
- `user-analytics/` - 유저 분석 대시보드 (x_enc_data 기준 유저별 요청, 토큰, 질문 패턴)

## For AI Agents
- 각 서브 대시보드는 독립적인 page.tsx를 가짐
- 차트 컴포넌트는 `src/components/charts/`에서 import
