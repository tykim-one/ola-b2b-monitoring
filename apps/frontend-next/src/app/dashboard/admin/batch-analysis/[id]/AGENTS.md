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
- `useParams()`로 동적 라우트 파라미터 `[id]` 접근
- 자동 새로고침 로직: `job.status === 'RUNNING'` 상태일 때만 5초 interval
- 결과 JSON 파싱 시도: `parseAnalysisResult()` 헬퍼 사용 (파싱 실패 시 raw Markdown 표시)
- 확장 가능한 결과 리스트: `expandedResult` state로 하나씩 펼치기/접기
- 품질 점수 색상 구분: 8+ (초록), 6-7 (노란색), 6 미만 (빨간색)
- 작업 실행: `POST /api/admin/batch-analysis/jobs/:id/run` 엔드포인트 호출
- 프로그레스 바: `(processedItems + failedItems) / totalItems * 100%`
- MarkdownViewer 컴포넌트 사용 (LLM 응답 및 분석 결과에 Markdown 포맷 적용)

## API Endpoints Used

- `GET /api/admin/batch-analysis/jobs/:id` - 작업 상세 조회
- `GET /api/admin/batch-analysis/results?jobId=:id&limit=100` - 결과 목록 조회
- `POST /api/admin/batch-analysis/jobs/:id/run` - 작업 실행

## Status Flow

```
PENDING → (Run Job 버튼) → RUNNING → (자동 새로고침) → COMPLETED / FAILED
```

## Result Analysis Format

분석 결과는 JSON 형식으로 저장되며, 다음 필드를 포함합니다:

```json
{
  "quality_score": 1-10,
  "relevance": 1-10,
  "completeness": 1-10,
  "clarity": 1-10,
  "issues": ["문제점 목록"],
  "improvements": ["개선 제안"],
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "한 줄 요약"
}
```

## Related Components

- `@/components/markdown/MarkdownViewer` - Markdown 렌더링 컴포넌트
- `@/services/batchAnalysisService` - API 클라이언트
- `lucide-react` - 상태 아이콘 (CheckCircle, XCircle, Clock, RefreshCw 등)
