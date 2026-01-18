<!-- Parent: ../AGENTS.md -->

# Batch Analysis Admin UI

배치 분석 파이프라인 관리를 위한 관리자 UI입니다.

## Purpose

- 배치 분석 작업 생성, 실행, 모니터링
- 분석 결과 조회 및 상세 확인
- 프롬프트 템플릿 관리

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/dashboard/admin/batch-analysis` | `page.tsx` | 작업 목록 및 통계 대시보드 |
| `/dashboard/admin/batch-analysis/[id]` | `[id]/page.tsx` | 작업 상세 및 결과 목록 |
| `/dashboard/admin/batch-analysis/prompts` | `prompts/page.tsx` | 프롬프트 템플릿 관리 |

## Components

| Component | Description |
|-----------|-------------|
| `CreateJobModal.tsx` | 새 분석 작업 생성 모달 |

## Features

- **작업 대시보드**: 전체 작업 목록, 상태별 통계
- **작업 생성**: 날짜, 테넌트, 샘플 크기, 프롬프트 선택
- **작업 실행**: PENDING 상태 작업 수동 실행
- **결과 조회**: 개별 분석 결과 확장/축소 UI
- **프롬프트 관리**: 템플릿 CRUD, 기본 템플릿 설정

## Service

`/services/batchAnalysisService.ts` 사용:
- `batchAnalysisApi.listJobs()`: 작업 목록
- `batchAnalysisApi.createJob()`: 작업 생성
- `batchAnalysisApi.runJob()`: 작업 실행
- `batchAnalysisApi.listResults()`: 결과 목록
- `batchAnalysisApi.listPromptTemplates()`: 템플릿 목록

## Subdirectories

- [`components/`](./components/AGENTS.md) - 배치 분석 관련 컴포넌트
- [`prompts/`](./prompts/AGENTS.md) - 프롬프트 템플릿 관리 페이지
- [`[id]/`](./%5Bid%5D/AGENTS.md) - 작업 상세 페이지

## For AI Agents

- 모든 API 호출은 JWT 인증 필요 (`analysis:read`, `analysis:write` 권한)
- 작업 상태 색상: PENDING(노란색), RUNNING(시안), COMPLETED(녹색), FAILED(빨간색)
- 결과 상세는 클릭으로 확장/축소
- 프롬프트 템플릿 변수: `{{user_input}}`, `{{llm_response}}`
