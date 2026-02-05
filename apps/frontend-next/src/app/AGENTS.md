<!-- Parent: ../AGENTS.md -->
# app/

## Purpose
Next.js 16 App Router 루트 디렉토리. 모든 페이지와 레이아웃을 포함하며, 파일 시스템 기반 라우팅을 제공합니다.

## Key Files
- `layout.tsx` - 전역 루트 레이아웃 (Geist 폰트, Providers, LayoutContent 래퍼)
- `page.tsx` - 홈페이지 (자동으로 /dashboard로 리다이렉트)
- `providers.tsx` - AuthContext, ChatbotContext 등 전역 Provider 래퍼
- `globals.css` - Tailwind CSS 전역 스타일

## Subdirectories
- `(auth)/` - 인증 레이아웃 그룹 (로그인 페이지), see (auth)/AGENTS.md
- `dashboard/` - 대시보드 메인 페이지들, see dashboard/AGENTS.md

## For AI Agents
- Next.js App Router 구조를 따름 (page.tsx가 라우트 엔드포인트)
- 괄호 `(auth)` 는 Route Group으로 URL에 포함되지 않음
- 모든 페이지는 'use client' 지시어 사용 (클라이언트 컴포넌트)
- `providers.tsx`에서 AuthContext, ChatbotContext 제공
- 루트 레이아웃은 다크 모드를 지원하지 않음 (suppressHydrationWarning 사용)

## Dependencies
- `@/contexts/AuthContext` - JWT 인증 상태 관리
- `@/contexts/ChatbotContext` - 플로팅 챗봇 상태 관리
- `@/components/LayoutContent` - 사이드바, 헤더, 챗봇 래퍼
