<!-- Parent: ../AGENTS.md -->
# LLM Providers

## Purpose
개별 LLM 서비스(Gemini, OpenAI, Anthropic)의 구체적인 구현체.

## Key Files
- `llm-provider.interface.ts` - LLM 프로바이더 공통 인터페이스
- `gemini.provider.ts` - Google Gemini API 프로바이더
- `openai.provider.ts` - OpenAI API 프로바이더
- `anthropic.provider.ts` - Anthropic Claude API 프로바이더

## For AI Agents
- 새 프로바이더 추가 시 LlmProvider 인터페이스 구현 필수
- 각 프로바이더는 환경변수로 API 키 설정
