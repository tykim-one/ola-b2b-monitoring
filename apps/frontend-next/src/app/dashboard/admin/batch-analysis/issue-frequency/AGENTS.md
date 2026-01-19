<!-- Parent: ../AGENTS.md -->

# Issue Frequency Dashboard

배치 분석 결과에서 발견된 이슈들의 빈도를 시각화하는 대시보드입니다.

## Purpose

- 분석 결과에서 추출된 이슈들의 발생 빈도 집계
- 가장 빈번한 문제점 패턴 식별
- 테넌트/기간별 이슈 트렌드 분석

## Key Files

| File | Description |
|------|-------------|
| `page.tsx` | 이슈 빈도 대시보드 페이지 |

## Features

- **이슈 빈도 차트**: Recharts BarChart로 시각화
- **필터링**: 테넌트, 기간(시작/종료일), 표시 개수 설정
- **상세 정보**: 각 이슈 클릭 시 샘플 결과 목록 표시
- **통계 요약**: 총 이슈 수, 분석 결과 수

## Data Flow

```
batchAnalysisApi.getIssueFrequency(params)
  ↓
Backend: GET /api/admin/batch-analysis/issue-frequency
  ↓
BatchAnalysisResult 테이블에서 issues 필드 집계
  ↓
이슈별 count, percentage, sampleResults 반환
```

## API Integration

```typescript
interface IssueFrequencyParams {
  jobId?: string;
  tenantId?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

const response = await batchAnalysisApi.getIssueFrequency(params);
// response: { issues: IssueFrequencyItem[], totalIssues, totalResults, filters }
```

## UI Components

- **필터 패널**: 테넌트 선택, 날짜 범위, 표시 개수
- **통계 카드**: 총 이슈 수, 분석 결과 수
- **바 차트**: 이슈별 빈도 (색상 그라데이션)
- **샘플 리스트**: 확장 시 관련 결과 목록

## Color Scheme

차트 색상은 순위에 따라 그라데이션:
- 1위: `#ef4444` (빨강)
- 2-3위: `#f97316` (주황)
- 4-5위: `#eab308` (노랑)
- 6위 이하: `#22c55e` (초록)

## For AI Agents

- 이 페이지는 JWT 인증 필요 (`analysis:read` 권한)
- 이슈 데이터는 `BatchAnalysisResult.issues` JSON 필드에서 파싱
- 빈 결과 시 "분석 결과가 없습니다" 메시지 표시
- 차트는 ResponsiveContainer로 반응형 처리
