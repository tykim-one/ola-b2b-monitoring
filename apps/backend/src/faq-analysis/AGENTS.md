<!-- Parent: ../AGENTS.md -->
# faq-analysis

## Purpose
FAQ(자주 묻는 질문) 분석 모듈입니다. BigQuery에서 사용자 질문 데이터를 추출하여 텍스트 정규화 기반 클러스터링 및 LLM 기반 유사 그룹 병합을 수행하고, 각 FAQ 그룹에 대해 LLM 사유 분석을 제공합니다.

## Key Files
- `faq-analysis.module.ts` - NestJS 모듈 정의
- `faq-analysis.controller.ts` - API 엔드포인트 (POST /api/quality/faq-analysis, GET /tenants)
- `faq-analysis.service.ts` - 메인 오케스트레이터, BigQuery 연동

## Subdirectories
- `services/` - [핵심 서비스들](services/AGENTS.md) (FAQClusteringService, ReasonAnalysisService)
- `dto/` - 요청/응답 DTO (FAQAnalysisRequestDto, FAQAnalysisResponseDto)

## Processing Pipeline
```
1. BigQuery에서 user_input 추출 (기간/테넌트 필터)
2. 텍스트 정규화 (공백, 특수문자, 대소문자 통일)
3. 동일 정규화 텍스트 그룹화
4. 빈도순 정렬 후 Top N 추출
5. LLM 클러스터링 (유사 그룹 병합) - 실패 시 4단계 결과 반환
6. 각 클러스터별 LLM 사유 분석
7. 최종 결과 반환
```

## API Endpoints
- `POST /api/quality/faq-analysis` - FAQ 분석 실행 (온디맨드)
- `GET /api/quality/faq-analysis/tenants` - 사용 가능한 테넌트 목록

## For AI Agents
- LLM 서비스는 `admin/analysis/llm/LLMService` 사용
- BigQuery 쿼리는 서비스 내에서 직접 실행 (별도 쿼리 파일 없음)
- LLM 실패 시 graceful degradation: 1차 그룹화 결과만 반환
