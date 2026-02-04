<!-- Parent: ../AGENTS.md -->
# quality

## Purpose
품질 모니터링 페이지입니다. 토큰 효율성 트렌드, 질문-응답 상관관계, 반복 질문 패턴을 분석합니다.

## Key Files
- `page.tsx` - 품질 KPI, 차트 (TokenEfficiencyTrendChart, QueryResponseScatterPlot), 반복 질문 테이블, FAQ 분석 섹션

## For AI Agents
- **토큰 효율성**: output_tokens / input_tokens 비율
- **상관관계**: 질문 길이 vs 응답 길이 산점도
- **반복 패턴**: 동일 질문이 여러 번 발생하는 패턴 (FAQ 후보)
- **FAQ 분석**: FAQAnalysisSection 컴포넌트로 클러스터링 결과 표시

## Dependencies
- Backend: `/api/quality/*` (NestJS)
- Hooks: use-quality.ts
- Components: TokenEfficiencyTrendChart, QueryResponseScatterPlot, FAQAnalysisSection
