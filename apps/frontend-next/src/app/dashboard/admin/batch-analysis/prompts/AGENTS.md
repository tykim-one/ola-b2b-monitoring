# Prompt Templates Management

<!-- Parent: ../AGENTS.md -->

## Purpose

배치 분석에 사용될 프롬프트 템플릿을 관리하는 페이지입니다. 사용자는 여러 프롬프트 템플릿을 생성, 수정, 삭제할 수 있으며, 기본 템플릿을 지정할 수 있습니다. 템플릿은 `{{user_input}}`과 `{{llm_response}}` 변수를 포함하여 대화 분석 시 동적으로 치환됩니다.

## Key Files

- **page.tsx** - 프롬프트 템플릿 관리 페이지 (Client Component)
  - 템플릿 목록 조회 및 표시
  - 인라인 생성/수정 폼 (토글 방식)
  - 템플릿 삭제 (ConfirmDialog 사용)
  - 기본 템플릿 설정 (isDefault 플래그)
  - 기본 프롬프트 상수 포함 (한글 품질 분석 프롬프트)
  - 템플릿 프리뷰 (첫 500자 표시)
  - 생성/수정 시간 표시
  - 비활성 상태 배지 표시

## For AI Agents

프롬프트 템플릿 기능 확장 시:
- 템플릿 변수는 `{{variable_name}}` 형식 사용 (이중 중괄호)
- 현재 지원 변수: `{{user_input}}`, `{{llm_response}}`
- `DEFAULT_PROMPT` 상수는 한글 기반 품질 분석 프롬프트 (quality_score, relevance, completeness 등 JSON 응답 요구)
- 기본 템플릿은 하나만 존재해야 함 (isDefault 플래그)
- 템플릿 프리뷰는 `<pre>` 태그로 포맷팅 유지
- 삭제 전 확인 대화상자 필수 (`ConfirmDialog` 컴포넌트 사용)
- 편집 모드 진입 시 다른 템플릿 편집 비활성화 (한 번에 하나만 편집)

## 필수 출력 포맷

**모든 프롬프트 템플릿은 아래 JSON 필드를 반환해야 합니다** (점수 집계/분석에 필요):

```json
{
  "quality_score": (1-10),
  "relevance": (1-10),
  "completeness": (1-10),
  "clarity": (1-10),
  "issues": ["..."],
  "improvements": ["..."],
  "sentiment": "positive|neutral|negative",
  "summary": "..."
}
```

- 폼에 `REQUIRED_OUTPUT_FORMAT` 가이드 박스 표시
- "프롬프트에 삽입" 버튼으로 표준 포맷 추가 가능

## API Endpoints Used

- `GET /api/admin/batch-analysis/prompts` - 템플릿 목록 조회
- `POST /api/admin/batch-analysis/prompts` - 템플릿 생성
- `PUT /api/admin/batch-analysis/prompts/:id` - 템플릿 수정
- `DELETE /api/admin/batch-analysis/prompts/:id` - 템플릿 삭제

## Template Variables

| Variable | Description |
|----------|-------------|
| `{{user_input}}` | 사용자의 원본 질문/입력 |
| `{{llm_response}}` | LLM의 원본 응답 |

## Related Components

- `@/components/ui/ConfirmDialog` - 삭제 확인 대화상자
- `@/services/batchAnalysisService` - API 클라이언트
