<!-- Parent: ../AGENTS.md -->
# app

## Purpose
Next.js App Router 페이지들입니다. 파일 기반 라우팅으로 URL 경로와 1:1 매핑됩니다.

## Key Files
- `layout.tsx` - 루트 레이아웃, Providers 래핑, Sidebar 포함
- `providers.tsx` - React Query, Auth, Zustand Provider 래퍼
- `page.tsx` - 메인 페이지 (대시보드로 리다이렉트)
- `globals.css` - 전역 Tailwind CSS 스타일
- `favicon.ico` - 파비콘

## Subdirectories
- `dashboard/` - 대시보드 관련 페이지 (메인 대시보드, 비즈니스/운영/품질 분석)
- `(auth)/` - 인증 페이지 (로그인)
- `dashboard/admin/` - 관리자 페이지 (사용자, 역할, 필터, 분석, 배치, 문제 채팅 규칙)
- `dashboard/business/` - 비즈니스 메트릭 (테넌트 사용량, 비용 트렌드)
- `dashboard/operations/` - 운영 메트릭 (실시간 트래픽, 에러율, 토큰 효율)
- `dashboard/quality/` - 품질 분석 (상관관계, 반복 쿼리)
- `dashboard/ai-performance/` - AI 성능 분석 (이상 탐지 포함)
- `dashboard/chatbot-quality/` - 챗봇 품질 메트릭
- `dashboard/user-analytics/` - 사용자 활동 분석 (x_enc_data 기준)
- `dashboard/etl/` - ETL 모니터링 (minkabu, wind)
- `dashboard/report-monitoring/` - 리포트 생성 모니터링
- `[projectId]/` - 동적 프로젝트 라우트
- `logs/` - 로그 뷰어 페이지
- `architecture/` - 아키텍처 뷰 페이지

## For AI Agents
- **동적 라우트**: `[projectId]`는 URL 파라미터로 프로젝트 ID를 받음
- **레이아웃 상속**: 하위 페이지는 layout.tsx의 Sidebar를 상속
- **서버 컴포넌트**: 기본적으로 서버 컴포넌트, 'use client' 선언 시 클라이언트
