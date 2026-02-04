<!-- Parent: ../AGENTS.md -->
# dashboard

## Purpose
메인 대시보드 라우트 그룹입니다. 모니터링의 핵심 페이지들이 위치하며, 사이드바 네비게이션을 포함하는 레이아웃을 공유합니다.

## Key Files
- `page.tsx` - 대시보드 홈 페이지 (실시간 KPI, 주요 차트)
- `layout.tsx` - 대시보드 레이아웃 (사이드바 + 콘텐츠 영역)

## Subdirectories
- `admin/` - 관리자 기능 (사용자/역할/필터/분석/배치/문제채팅 관리)
- `business/` - 비즈니스 메트릭 페이지
- `operations/` - 운영 메트릭 페이지
- `quality/` - 품질 분석 페이지
- `ai-performance/` - AI 성능 분석 페이지
- `chatbot-quality/` - 챗봇 품질 메트릭 페이지
- `user-analytics/` - 사용자 활동 분석 (x_enc_data 기준)
- `analysis/` - 일반 분석 페이지
- `etl/` - ETL 모니터링 (minkabu/, wind/)
- `report-monitoring/` - 리포트 생성 모니터링

## For AI Agents
- 각 하위 디렉토리에 `page.tsx`가 Next.js App Router 페이지
- 인증 필수 (JwtAuthGuard 적용)
- 사이드바 네비게이션은 Sidebar 컴포넌트에서 관리
