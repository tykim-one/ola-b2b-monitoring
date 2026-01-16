<!-- Parent: ../AGENTS.md -->
# src

## Purpose
Next.js 프론트엔드 애플리케이션의 소스 코드입니다. App Router, 컴포넌트, 서비스, FSD(Feature-Sliced Design) 구조를 포함합니다.

## Key Files
- `middleware.ts` - Next.js 미들웨어 (라우팅 제어)
- `types.ts` - 로컬 타입 정의

## Subdirectories
- `app/` - Next.js App Router 페이지 및 레이아웃
- `components/` - 재사용 가능한 UI 컴포넌트 (차트, KPI 카드, compound 등)
- `hooks/` - React Query 커스텀 훅 (queries/, mutations/)
- `stores/` - Zustand 상태 관리 스토어
- `services/` - API 클라이언트, 외부 서비스 연동
- `entities/` - 도메인 엔티티 (FSD 레이어)
- `features/` - 기능별 모듈 (FSD 레이어)
- `widgets/` - 복합 위젯 컴포넌트 (FSD 레이어)
- `lib/` - 유틸리티, 상수, 스키마
- `contexts/` - React Context 전역 상태 관리

## For AI Agents
- **라우팅**: App Router 사용, 파일 기반 라우팅
- **스타일링**: Tailwind CSS, globals.css
- **상태 관리**: React Query (서버 상태) + Zustand (UI 상태)
- **아키텍처**: FSD 패턴 일부 적용 (entities, features, widgets)
- **데이터 페칭**: hooks/queries/ 의 커스텀 훅 사용
- **폼 검증**: Zod 스키마 (lib/schemas/) + react-hook-form
