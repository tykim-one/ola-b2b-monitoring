<!-- Parent: ../AGENTS.md -->
# Services

## Purpose
FAQ 분석의 핵심 비즈니스 로직을 구현합니다. 질문 클러스터링, LLM 기반 사유 분석 등의 서비스를 제공합니다.

## Key Files
- `faq-clustering.service.ts` - FAQ 클러스터링 서비스 (유사 질문 그룹화, 빈도 분석)
- `reason-analysis.service.ts` - LLM 기반 사유 분석 서비스 (Gemini 연동)

## For AI Agents
- 클러스터링은 텍스트 유사도 기반 (Jaccard, 코사인 유사도 등)
- LLM 분석 시 프롬프트 설계 주의
- BigQuery 데이터 조회 → 클러스터링 → LLM 분석 파이프라인

## Dependencies
- Gemini LLM API
- BigQuery (MetricsDataSource)
- `interfaces/`의 타입 정의
