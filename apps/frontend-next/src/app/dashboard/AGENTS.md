<!-- Parent: ../AGENTS.md -->
# dashboard/

## Purpose
대시보드 메인 루트 디렉토리. 모든 모니터링, 분석, 관리 페이지를 포함합니다.

## Key Files
- `page.tsx` - 대시보드 홈 페이지 (메트릭 카드 그리드)
- `AGENTS.md` - 이 문서 (layout.tsx 없음, 전역 레이아웃 상속)

## Subdirectories
- `admin/` - 어드민 기능 (사용자, 역할, 필터, 분석, 배치 분석), see admin/AGENTS.md
- `business/` - 비즈니스 메트릭 (테넌트 사용량, 비용 트렌드), see business/AGENTS.md
- `operations/` - 운영 메트릭 (시간별 트래픽, 에러 분석), see operations/AGENTS.md
- `quality/` - 품질 분석 (효율성 트렌드, 상관관계), see quality/AGENTS.md
- `chatbot-quality/` - 챗봇 품질 분석 (대화 품질 점수), see chatbot-quality/AGENTS.md
- `user-analytics/` - 유저별 활동 분석 (x_enc_data 기준), see user-analytics/AGENTS.md
- `etl/` - ETL 모니터링 (minkabu, wind), see etl/AGENTS.md

## For AI Agents
- **URL 경로**: `/dashboard/*`
- **레이아웃**: 전역 LayoutContent에서 사이드바, 헤더 제공
- **인증**: AuthContext에서 로그인 상태 확인 (미인증 시 /login으로 리다이렉트)
- **공통 패턴**:
  - Dashboard 컴포넌트 사용 (로딩, 에러, KPI 섹션, 차트 섹션, 테이블 섹션)
  - DateRangeFilter로 날짜 범위 선택
  - KPICard로 주요 지표 표시
  - Recharts 차트 라이브러리 사용
  - DataTable로 테이블 데이터 표시

## Dependencies
- `@/components/compound/Dashboard` - 대시보드 레이아웃 컴포넌트
- `@/components/kpi/KPICard` - KPI 카드 컴포넌트
- `@/components/charts/*` - 차트 컴포넌트들
- `@/hooks/queries/*` - React Query 기반 API 훅들
- `@ola/shared-types` - 백엔드와 공유하는 타입
