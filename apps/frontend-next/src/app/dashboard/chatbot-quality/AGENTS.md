<!-- Parent: ../AGENTS.md -->
# chatbot-quality/

## Purpose
챗봇 품질 분석 페이지. 일별 자동 채팅 품질 점수 및 LLM 분석 결과를 시각화합니다.

## Key Files
- `page.tsx` - 챗봇 품질 대시보드 (배치 분석 결과 조회)

## Subdirectories
없음

## For AI Agents
- **URL 경로**: `/dashboard/chatbot-quality`
- **주요 기능**:
  - 배치 분석 결과 조회 (평균 점수, 감정 분석, 이슈 검출)
  - 필터링: 점수 범위, 감정(긍정/부정/중립), 이슈 유무
  - Markdown 렌더링: LLM 응답 내용 표시
- **데이터 소스**: `/api/admin/batch-analysis/results` API
- **연동**: batch-analysis 모듈과 밀접한 관계

## Dependencies
- `@/hooks/queries` - useBatchAnalysisResults
- `@/components/compound/Dashboard`
- `@/components/markdown/MarkdownRenderer` - LLM 응답 렌더링
- `@ola/shared-types` - BatchAnalysisResult
