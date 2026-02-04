<!-- Parent: ../AGENTS.md -->

# Session Analysis Module

세션 기반 대화 품질 분석 모듈 - 사용자가 원하는 응답에 도달했는지, 얼마나 많은 질문이 필요했는지 분석

## Purpose

- **세션 해결률 분석**: 사용자가 원하는 정보를 얻었는지 판단
- **세션 효율성 분석**: 해결까지 필요한 평균 턴(질문) 수
- **이탈률 분석**: 해결 없이 종료된 세션 비율
- **세션 타임라인**: 대화 흐름 시각화

## Key Files

| File | Description |
|------|-------------|
| `session-analysis.module.ts` | NestJS 모듈 정의 |
| `session-analysis.service.ts` | 핵심 비즈니스 로직 (휴리스틱 + LLM 분석) |
| `session-analysis.controller.ts` | REST API 엔드포인트 |
| `index.ts` | 배럴 export |

## Subdirectories
- `dto/` - [API 요청 유효성 검사 DTO](dto/AGENTS.md) (SessionFilterDto)

## Architecture

### 해결 판단 방식 (하이브리드)

1. **휴리스틱 (1차 판단)**:
   - 감사 표현으로 종료 ("감사합니다", "thanks", "got it")
   - 불만 없이 모든 응답 성공 (success=true)

2. **LLM 분석 (2차, 수동 트리거)**:
   - 대화 맥락 분석으로 해결 여부 판단
   - 이탈 이유 분석 ("정보 부족", "반복 응답" 등)
   - 품질 점수 부여 (1-10)

### BigQuery 쿼리

`metrics.queries.ts`에 추가된 쿼리:

- `sessionConversationHistory`: 세션별 대화 내역
- `sessionResolutionStats`: 해결 통계 집계
- `sessionList`: 세션 목록 (페이지네이션)
- `sessionCount`: 총 세션 수
- `sessionsForDate`: 특정 날짜 세션 (배치용)

## API Endpoints

```
GET  /api/admin/session-analysis/stats          - 세션 통계 (해결률, 평균 턴 수 등)
GET  /api/admin/session-analysis/sessions       - 세션 목록 (필터링, 페이지네이션)
GET  /api/admin/session-analysis/sessions/:id/timeline - 세션 타임라인
POST /api/admin/session-analysis/sessions/:id/analyze  - LLM 심층 분석
GET  /api/admin/session-analysis/tenants        - 필터용 테넌트 목록
```

## For AI Agents

- 세션 분석 관련 수정 시 이 디렉토리 파일들을 확인
- 휴리스틱 패턴 수정: `session-analysis.service.ts`의 `analyzeSessionHeuristic()` 메서드
- LLM 프롬프트 수정: `analyzeSessionWithLLM()` 메서드
- 새 쿼리 추가: `metrics/queries/metrics.queries.ts`

## Dependencies

- `LLMModule`: Gemini/OpenAI/Anthropic 통합 LLM 서비스
- `ConfigModule`: 환경 설정 (BigQuery 연결 정보)
