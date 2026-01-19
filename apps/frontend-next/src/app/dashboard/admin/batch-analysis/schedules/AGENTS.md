<!-- Parent: ../AGENTS.md -->

# Batch Analysis Schedules Page

배치 분석 스케줄 관리 페이지입니다.

## Purpose

- 배치 분석 자동 실행 스케줄 생성, 수정, 삭제
- 스케줄 활성화/비활성화 토글
- 실행 시간, 요일, 대상 테넌트, 샘플 크기 설정

## Key Files

| File | Description |
|------|-------------|
| `page.tsx` | 스케줄 목록 및 관리 메인 페이지 |

## Components

| Component | Location | Description |
|-----------|----------|-------------|
| `ScheduleFormModal` | `components/ScheduleFormModal.tsx` | 스케줄 생성/수정 모달 폼 |

## Features

### Schedule List Table
- 스케줄 상태 (활성화/비활성화) 토글 스위치
- 실행 시간 및 요일 표시 (한글 포맷)
- 대상 테넌트, 샘플 수 표시
- 수정/삭제 액션 버튼

### Schedule Form
- 스케줄 이름 입력
- 실행 시간 설정 (시, 분)
- 요일 선택 (월~일, 평일, 매일 등)
- 대상 테넌트 선택 (전체 또는 특정 테넌트)
- 샘플 크기 설정 (10-500)
- 프롬프트 템플릿 선택 (옵션)

### Schedule Stats
- 전체 스케줄 수
- 활성 스케줄 수
- 비활성 스케줄 수

## Service API

`/services/batchAnalysisService.ts` 사용:
- `listSchedules()`: 전체 스케줄 목록 조회
- `createSchedule(data)`: 새 스케줄 생성
- `updateSchedule(id, data)`: 스케줄 수정
- `deleteSchedule(id)`: 스케줄 삭제
- `toggleSchedule(id)`: 활성화/비활성화 토글
- `listPromptTemplates()`: 프롬프트 템플릿 목록
- `getAvailableTenants(days)`: 사용 가능한 테넌트 목록

## Data Types

```typescript
interface BatchSchedulerConfig {
  id: string;
  name: string;
  isEnabled: boolean;
  hour: number;              // 0-23
  minute: number;            // 0-59
  daysOfWeek: string;        // "1,2,3,4,5" (0=일, 1=월, ...)
  targetTenantId: string | null;
  sampleSize: number;
  promptTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## Subdirectories

- [`components/`](./components/AGENTS.md) - 스케줄 관련 UI 컴포넌트

## For AI Agents

- 스케줄은 node-cron 형식으로 백엔드에서 자동 실행됨
- 요일 형식: "1,2,3,4,5" (ISO 요일 번호, 0=일요일, 6=토요일)
- 평일 감지: "1,2,3,4,5" → "평일"로 표시
- 매일 감지: "0,1,2,3,4,5,6" → "매일"로 표시
- 모달은 ConfirmDialog 컴포넌트 사용 (삭제 확인)
- JWT 인증 필요 (`analysis:write` 권한)
