<!-- Parent: ../AGENTS.md -->
# LLM Integration Module

## Purpose
다양한 LLM 프로바이더(Gemini, OpenAI, Anthropic)를 추상화하여 통합 인터페이스 제공.

## Key Files
- `llm.module.ts` - NestJS 모듈 정의
- `llm.service.ts` - LLM 호출 서비스 (프로바이더 선택 및 호출)
- `index.ts` - 모듈 익스포트

## Subdirectories
- `providers/` - 개별 LLM 프로바이더 구현체

## For AI Agents
- 새 LLM 프로바이더 추가 시 `providers/`에 구현하고 LlmProvider 인터페이스 구현
- 환경변수로 프로바이더 선택 가능

## Dependencies
- @google/generative-ai (Gemini)
- OpenAI, Anthropic SDK (옵션)
