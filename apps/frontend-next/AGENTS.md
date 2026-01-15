<!-- Parent: ../AGENTS.md -->
# frontend-next

## Purpose
Next.js 16 (App Router) 기반 B2B 모니터링 대시보드입니다. React 19와 Recharts를 사용하여 LLM 사용량 메트릭을 시각화합니다.

## Key Files
- `src/app/layout.tsx` - 루트 레이아웃, 사이드바 포함
- `src/app/page.tsx` - 메인 페이지 (대시보드로 리다이렉트)
- `src/middleware.ts` - 라우팅 미들웨어
- `next.config.ts` - Next.js 설정
- `tailwind.config.ts` - Tailwind CSS 설정

## Subdirectories
- `src/app/` - Next.js App Router 페이지들
- `src/components/` - 재사용 가능한 UI 컴포넌트
- `src/services/` - API 클라이언트, 외부 서비스 연동
- `src/entities/` - 도메인 엔티티 (FSD 아키텍처)
- `src/features/` - 기능별 모듈 (FSD 아키텍처)
- `src/widgets/` - 위젯 컴포넌트 (FSD 아키텍처)
- `src/lib/` - 유틸리티, 상수
- `public/` - 정적 파일

## For AI Agents
- **개발 서버**: `pnpm dev` (포트 3001)
- **빌드**: `pnpm build`
- **린트**: `pnpm lint`
- **아키텍처**: Feature-Sliced Design (FSD) 패턴 일부 적용
- **스타일링**: Tailwind CSS 4
- **차트**: Recharts 라이브러리

## Dependencies
- `next` 16.x - React 프레임워크
- `react` 19.x - UI 라이브러리
- `recharts` - 차트 라이브러리
- `lucide-react` - 아이콘
- `@google/genai` - Gemini AI 연동
- `@ola/shared-types` - 공유 타입
