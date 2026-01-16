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
- `dashboard/` - 대시보드 관련 페이지
- `(auth)/` - 인증 페이지 (로그인)
- `dashboard/admin/` - 관리자 페이지 (사용자, 역할 관리)
- `dashboard/analysis/` - LLM 분석 채팅 인터페이스
- `[projectId]/` - 동적 프로젝트 라우트
- `logs/` - 로그 뷰어 페이지
- `architecture/` - 아키텍처 뷰 페이지

## For AI Agents
- **동적 라우트**: `[projectId]`는 URL 파라미터로 프로젝트 ID를 받음
- **레이아웃 상속**: 하위 페이지는 layout.tsx의 Sidebar를 상속
- **서버 컴포넌트**: 기본적으로 서버 컴포넌트, 'use client' 선언 시 클라이언트
