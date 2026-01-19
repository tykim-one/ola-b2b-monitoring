# Batch Analysis Job Detail

<!-- Parent: ../AGENTS.md -->

## Purpose

개별 배치 분석 작업의 상세 정보와 실행 결과를 표시하는 페이지입니다. 작업 상태, 진행률, 분석 결과를 실시간으로 모니터링하고, PENDING 상태의 작업을 실행할 수 있는 기능을 제공합니다. Dynamic Route `[id]`를 사용하여 작업 ID 기반으로 접근합니다.

## Key Files

- **page.tsx** - 배치 분석 작업 상세 페이지 (Client Component)
  - 작업 정보 표시 (상태, 대상 날짜, 진행률, 테넌트)
  - 실시간 상태 업데이트 (5초마다 RUNNING 상태 시 자동 새로고침)
  - 작업 실행 버튼 (PENDING 상태일 때만 표시)
  - 분석 결과 목록 (확장/축소 가능)
  - 결과 상세 정보 (사용자 입력, LLM 응답, 분석 결과, 품질 점수)
  - 진행률 바 (처리된 항목 / 전체 항목)
  - 상태별 아이콘 및 색상 (PENDING: 노란색, RUNNING: cyan, COMPLETED: 초록색, FAILED: 빨간색)
  - JSON 파싱 및 포맷팅 (quality_score, relevance 등)
  - Markdown 뷰어 사용 (LLM 응답 표시)

## For AI Agents

작업 상세 페이지 기능 확장 시:
- `useParams()`로 동적 라우트 파라미터 `[id]` 접근 (`params?.id` null 체크 필수)
- 자동 새로고침 로직: `job.status === 'RUNNING'` 상태일 때만 5초 interval
- **파싱된 컬럼 직접 사용**: `result.qualityScore`, `result.relevance` 등 DB 컬럼 직접 접근
- 확장 가능한 결과 리스트: `expandedResult` state로 하나씩 펼치기/접기
- 품질 점수 색상 구분: 8+ (초록), 6-7 (노란색), 6 미만 (빨간색)
- 작업 실행: `POST /api/admin/batch-analysis/jobs/:id/run` 엔드포인트 호출
- 프로그레스 바: `(processedItems + failedItems) / totalItems * 100%`
- MarkdownViewer 컴포넌트 사용 (LLM 응답 표시)

### 구조화된 분석 결과 UI

결과 상세 영역에서 파싱된 컬럼들을 구조화된 형태로 표시:
- **점수 그리드**: Quality, Relevance, Completeness, Clarity (4열 그리드)
- **Sentiment 배지**: positive(초록), neutral(회색), negative(빨간) 배지
- **Summary 텍스트**: 한 줄 요약
- **Issues 리스트**: 빨간색 bullet 리스트
- **Improvements 리스트**: 시안색 bullet 리스트
- **Missing Data**: JSON 형태로 표시
- **Fallback**: 파싱된 컬럼이 없으면 raw JSON 표시

## API Endpoints Used

- `GET /api/admin/batch-analysis/jobs/:id` - 작업 상세 조회
- `GET /api/admin/batch-analysis/results?jobId=:id&limit=100` - 결과 목록 조회
- `POST /api/admin/batch-analysis/jobs/:id/run` - 작업 실행

## Status Flow

```
PENDING → (Run Job 버튼) → RUNNING → (자동 새로고침) → COMPLETED / FAILED
```

## Result Analysis Format

분석 결과는 백엔드에서 파싱되어 별도 컬럼으로 저장됩니다:

### Raw JSON (analysisResult 필드)
```json
{
  "quality_score": 1-10,
  "relevance": 1-10,
  "completeness": 1-10,
  "clarity": 1-10,
  "issues": ["문제점 목록"],
  "improvements": ["개선 제안"],
  "missing_data": [{ "data_needed": "...", "why": "...", "priority": "p0|p1|p2" }],
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "한 줄 요약"
}
```

### 파싱된 컬럼 (BatchAnalysisResult 타입)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `qualityScore` | number \| null | 품질 점수 (1-10) |
| `relevance` | number \| null | 관련성 점수 (1-10) |
| `completeness` | number \| null | 완성도 점수 (1-10) |
| `clarity` | number \| null | 명확성 점수 (1-10) |
| `sentiment` | string \| null | 감정 (positive/neutral/negative) |
| `summaryText` | string \| null | 한 줄 요약 |
| `issues` | string \| null | JSON 문자열 (배열) |
| `improvements` | string \| null | JSON 문자열 (배열) |
| `missingData` | string \| null | JSON 문자열 (객체 배열) |
| `issueCount` | number \| null | issues 배열 길이 |
| `avgScore` | number \| null | 4개 점수의 평균 |

## Related Components

- `@/components/markdown/MarkdownViewer` - Markdown 렌더링 컴포넌트
- `@/services/batchAnalysisService` - API 클라이언트
- `lucide-react` - 상태 아이콘 (CheckCircle, XCircle, Clock, RefreshCw 등)
