# OLA B2B Monitoring

## Purpose
GCP BigQuery 기반 B2B LLM 로그 모니터링 대시보드 시스템입니다. 테넌트별 LLM 사용량, 토큰 효율성, 비용 트렌드, 이상 탐지 등을 시각화합니다.

## Key Files
- `package.json` - 루트 워크스페이스 설정, 통합 스크립트
- `pnpm-workspace.yaml` - pnpm 모노레포 워크스페이스 정의
- `CLAUDE.md` - Claude Code용 프로젝트 가이드

## Subdirectories
- `apps/` - 애플리케이션 패키지들 (see apps/AGENTS.md)
  - `apps/backend/` - NestJS API 서버 (see apps/backend/AGENTS.md)
  - `apps/frontend-next/` - Next.js 16 대시보드 (see apps/frontend-next/AGENTS.md)
- `packages/` - 공유 라이브러리 (see packages/AGENTS.md)
  - `packages/shared-types/` - 프론트/백엔드 공유 TypeScript 타입
- `docs/` - 프로젝트 문서 (see docs/AGENTS.md)
  - 프로젝트 개요, 기능 가이드, API 명세, 아키텍처, DB 스키마 등

## For AI Agents
- **개발 서버**: `pnpm dev:all`로 프론트엔드(3001)와 백엔드(3000) 동시 실행
- **타입 공유**: 프론트/백엔드 간 타입은 `@ola/shared-types`에서 import
- **API 패턴**: 모든 메트릭 API는 `/projects/:projectId/api/*` 경로를 따름 (데이터소스 중립)
- **환경변수**: 백엔드는 `apps/backend/.env`, 프론트엔드는 `apps/frontend-next/.env.local`
- **인증**: JWT + RBAC 기반 (`@Public()` 데코레이터로 공개 API 지정)
- **AGENTS.md 갱신**: 디렉토리 구조 변경 시 `/deepinit --update` 실행 필수

## Key Features
- **대시보드**: 실시간 KPI, 비즈니스/운영/품질 분석, 사용자 분석
- **관리자 기능**: 사용자/역할 관리, 저장된 필터, AI 분석 세션
- **배치 분석**: 일일 자동 품질 분석 파이프라인 (LLM 기반)
- **AI 챗봇**: 플로팅 챗봇 (Ctrl+K), 페이지 컨텍스트 인식
- **이상 탐지**: Z-Score 기반 토큰/에러/트래픽 이상 감지 → Slack 알림
- **문제 채팅 탐지**: 동적 규칙 엔진 기반 문제 채팅 필터링/모니터링
- **리포트 모니터링**: 리포트 생성 품질 검증 (forex, commodity, ai_stock, dividend)
- **ETL 모니터링**: Minkabu/Wind 데이터 ETL 파이프라인 상태 감시
- **사용자 프로파일링**: 카테고리 분류, 감정 분석, 행동 패턴 분석
- **FAQ 분석**: 자주 묻는 질문 클러스터링 및 LLM 사유 분석
- **세션 분석**: 세션 해결률, 효율성, 이탈률 (휴리스틱+LLM 하이브리드)

## Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐   │
│  │Dashboard│  │  KPI    │  │ Charts  │  │ LogExplorer  │   │
│  │  Admin  │  │Analysis │  │ Login   │  │ AuthContext  │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬───────┘   │
└───────┼────────────┼────────────┼───────────────┼───────────┘
        │            │            │               │
        └────────────┴─────┬──────┴───────────────┘
                           │ HTTP (REST API + JWT)
┌──────────────────────────┼──────────────────────────────────┐
│                    Backend (NestJS)                          │
│  ┌───────────────┐  ┌─────────────┐  ┌────────────────┐    │
│  │MetricsModule  │  │CacheModule  │  │ MlModule       │    │
│  │ (캐싱 적용)    │  │(node-cache) │  │(이상 탐지)     │    │
│  └───────┬───────┘  └──────┬──────┘  └───────┬────────┘    │
│          │                 │                 │              │
│  ┌───────┴─────────────────┴─────────────────┴──────────┐  │
│  │               AdminModule (SQLite + Prisma)           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │AuthModule│  │UsersModule│ │AnalysisModule    │   │  │
│  │  │(JWT/RBAC)│  │RolesModule│ │(LLM: Gemini)     │   │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌───────▼─────────────────────────────────────────────────┐│
│  │           DataSourceModule (추상화 레이어)               ││
│  │  ┌─────────────────────┐  ┌──────────────────────┐     ││
│  │  │MetricsDataSource IF │→ │BigQueryMetricsDataSrc│     ││
│  │  └─────────────────────┘  └──────────────────────┘     ││
│  └──────────┬──────────────────────────────────────────────┘│
└─────────────┼───────────────────────────────────────────────┘
              │
     ┌────────▼────────┐    ┌─────────────────┐  ┌──────────┐
     │  GCP BigQuery   │    │   SQLite        │  │  Gemini  │
     │  (로그 데이터)   │    │ (Admin DB)      │  │  (LLM)   │
     └─────────────────┘    └─────────────────┘  └──────────┘
```

## BigQuery Schema (Flat Schema)
테이블은 플랫 스키마 사용 (jsonPayload 중첩 아님):
- `success`: BOOL (TRUE/FALSE) - 문자열 비교 금지
- `input_tokens`, `output_tokens`, `total_tokens`: STRING → CAST AS FLOAT64 필요
- `request_metadata`: STRUCT (service, endpoint, session_id 포함)

## Dependencies
- GCP BigQuery 연동 (서비스 계정 필요)
- pnpm (패키지 매니저)
- Node.js 20+
