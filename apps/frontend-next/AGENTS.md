<!-- Parent: ../AGENTS.md -->
# frontend-next

## Purpose
Next.js 16 + React 19 대시보드 - Recharts 시각화, JWT 인증, 글로벌 AI 챗봇이 포함된 B2B LLM 모니터링 시스템입니다. Tailwind CSS 다크모드 테마를 사용하여 실시간 메트릭, 비용 트렌드, 이상 탐지, 배치 분석 결과를 시각화합니다.

## Key Files
- `next.config.ts` - Next.js 설정 (Turbopack, output: standalone)
- `tailwind.config.js` - Tailwind CSS 설정 (다크모드 테마 색상)
- `.env.local` - 환경변수 (NEXT_PUBLIC_API_URL)
- `src/app/layout.tsx` - 루트 레이아웃 (AuthProvider, ChatbotProvider, ReactQueryProvider)
- `src/middleware.ts` - 인증 미들웨어 (JWT 검증, 로그인 리다이렉트)
- `postcss.config.mjs` - PostCSS 설정 (Tailwind CSS)
- `eslint.config.mjs` - ESLint 설정
- `tsconfig.json` - TypeScript 설정

## Subdirectories
- `src/app/` - Next.js App Router 페이지
  - `(auth)/login/` - 로그인 페이지
  - `dashboard/admin/` - 관리자 기능 (users, roles, filters, analysis, batch-analysis)
  - `dashboard/business/` - 비즈니스 메트릭
  - `dashboard/operations/` - 운영 메트릭
  - `dashboard/quality/` - 품질 분석
  - `dashboard/chatbot-quality/` - 챗봇 품질 분석
- `src/components/` - React 컴포넌트
  - `charts/` - Recharts 기반 차트 컴포넌트 (AreaChart, BarChart, HeatMap, Treemap 등)
  - `kpi/` - KPICard 컴포넌트
  - `chatbot/` - ChatWindow, MessageList, ChatInput
  - `compound/` - 복합 컴포넌트 (Dashboard, DataTable, Chart)
  - `ui/` - 기본 UI 컴포넌트 (Button, Input, Card, Badge, Dialog 등)
  - `markdown/` - Markdown 렌더링 (LLM 응답용)
- `src/contexts/` - React Context
  - `AuthContext.tsx` - JWT 인증 상태 관리 (로그인, 로그아웃, 토큰 갱신)
  - `ChatbotContext.tsx` - 글로벌 AI 챗봇 상태 관리 (메시지, 세션, 열림/닫힘)
  - `ReactQueryProvider.tsx` - React Query 설정
- `src/services/` - API 클라이언트
  - `batchAnalysisService.ts` - 배치 분석 API
  - `analysisService.ts` - LLM 분석 세션 API
  - `authService.ts` - 인증 API
  - `userService.ts`, `roleService.ts`, `filterService.ts` - 관리자 API
- `src/lib/` - 유틸리티
  - `api-client.ts` - Axios 인스턴스 (자동 토큰 갱신 인터셉터)
  - `utils.ts` - 유틸리티 함수 (cn, formatters)
  - `constants.ts` - 상수 정의
- `src/hooks/` - Custom hooks (React Query hooks)
- `src/entities/` - 도메인 엔티티 (FSD 아키텍처, project/ 등)
- `src/features/` - 기능별 모듈 (FSD 아키텍처, log-filtering/ 등)
- `src/widgets/` - 위젯 컴포넌트 (FSD 아키텍처)
- `src/stores/` - 상태 관리 (Zustand 등)
- `src/pages/` - 레거시 pages 디렉토리 (마이그레이션 중)
- `public/` - 정적 파일 (이미지, 폰트 등)

## For AI Agents

### 환경변수
- `NEXT_PUBLIC_API_URL` - 백엔드 API URL (기본값: http://localhost:3000)

### 개발 명령어
- `pnpm dev` - 개발 서버 실행 (포트 3001, Turbopack)
- `pnpm build` - 프로덕션 빌드 (output: standalone)
- `pnpm start` - 프로덕션 서버 실행
- `pnpm lint` - ESLint 검사

### 스타일링 (Tailwind CSS 다크모드)
- **배경색**: `bg-slate-800` (차트), `bg-slate-900` (페이지)
- **텍스트색**: `text-slate-100`, `text-slate-300`
- **Recharts 색상 팔레트**: `#3b82f6` (파랑), `#8b5cf6` (보라), `#10b981` (초록), `#f59e0b` (주황), `#ef4444` (빨강)
- **차트 그리드**: `stroke="#1e293b"` (어두운 회색)

### 인증 시스템
- **AuthContext**: JWT 토큰 관리, localStorage에 저장
- **api-client.ts**: Axios 인터셉터로 자동 토큰 갱신 (401 시 refresh 엔드포인트 호출)
- **middleware.ts**: 보호된 라우트 (`/dashboard/*`)에서 JWT 검증, 없으면 `/login`으로 리다이렉트
- **토큰 타입**: Access Token (15분), Refresh Token (7일, httpOnly 쿠키)

### 글로벌 AI 챗봇
- **ChatbotContext**: 플로팅 챗봇 상태 관리 (페이지 컨텍스트 기반)
- **단축키**: `Ctrl+K` (Windows/Linux), `Cmd+K` (Mac) - 챗봇 열기/닫기
- **컴포넌트**: `ChatWindow` (플로팅 UI), `MessageList`, `ChatInput`
- **API**: `/api/chatbot/chat` (스트리밍 응답, SSE)
- **Markdown 렌더링**: `react-markdown` + `remark-gfm` (코드 블록, 테이블 지원)

### 데이터 페칭 (React Query)
- **ReactQueryProvider**: 전역 React Query 설정 (staleTime: 5분)
- **Hooks**: `useBatchAnalysisJobs`, `useAnalysisSessions`, `useUsers` 등
- **캐싱 전략**: 서버 응답 캐싱으로 불필요한 요청 최소화

### 차트 컴포넌트 (Recharts)
- **AreaChart**: 시간별 트래픽, 비용 트렌드
- **BarChart**: 테넌트별 사용량, 에러 분석
- **HeatMap**: 사용량 히트맵 (Custom Cell)
- **Treemap**: 계층적 데이터 시각화
- **Tooltip**: 커스텀 툴팁 (`bg-slate-700`, `text-slate-100`)
- **ResponsiveContainer**: 반응형 차트 래퍼

### 페이지 구조 (App Router)
- **인증 그룹** `(auth)`: 로그인 페이지 (레이아웃 분리)
- **대시보드**: `/dashboard/*` - 사이드바 포함 레이아웃
- **관리자**: `/dashboard/admin/*` - 사용자/역할/필터 관리, LLM 분석, 배치 분석
- **메트릭**: `/dashboard/business/*`, `/dashboard/operations/*`, `/dashboard/quality/*`

### API 라우트 패턴
프론트엔드는 백엔드 API를 직접 호출합니다 (Next.js API Routes 미사용):
- `GET /api/metrics/*` - 메트릭 API
- `GET /api/analytics/*` - 분석 API
- `GET /api/quality/*` - 품질 API
- `POST /api/admin/auth/login` - 로그인
- `POST /api/admin/analysis/sessions/:id/chat` - LLM 대화
- `GET /api/admin/batch-analysis/*` - 배치 분석 API

### 타입 안전성
- `@ola/shared-types` 패키지에서 타입 import
- 백엔드와 타입 동기화 (RealtimeKPI, HourlyTraffic, TenantUsage 등)

## Dependencies
- `next` 16.x - React 프레임워크 (App Router, Turbopack)
- `react` 19.x - UI 라이브러리
- `recharts` - 차트 라이브러리
- `@tanstack/react-query` - 서버 상태 관리
- `axios` - HTTP 클라이언트
- `react-markdown` + `remark-gfm` - Markdown 렌더링
- `lucide-react` - 아이콘
- `tailwindcss` - 유틸리티 CSS 프레임워크
- `@ola/shared-types` - 공유 타입 (백엔드와 동기화)
