<!-- Parent: ../AGENTS.md -->
# Analysis Module

## Purpose
LLM 기반 데이터 분석 세션 관리 모듈. 관리자가 분석 세션을 생성하고 LLM과 대화하며 데이터를 분석할 수 있습니다.

## Key Files
- `analysis.module.ts` - NestJS 모듈 정의
- `analysis.controller.ts` - REST API 엔드포인트 (/admin/analysis)
- `analysis.service.ts` - 분석 세션 비즈니스 로직

## Subdirectories
- `dto/` - 요청/응답 데이터 전송 객체
- `llm/` - LLM 프로바이더 통합 모듈

## For AI Agents
- LLM 프로바이더 추가 시 `llm/providers/` 디렉토리에 구현
- 세션 상태는 Prisma를 통해 SQLite에 저장됨

## Dependencies
- AdminModule (auth, database)
- LlmModule (llm/)
