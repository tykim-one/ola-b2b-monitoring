<!-- Parent: ../AGENTS.md -->
# Chatbot Module

## Purpose

페이지 컨텍스트 기반 AI 대화를 제공하는 글로벌 플로팅 챗봇 API 모듈입니다. 사용자가 현재 대시보드 페이지에 표시된 메트릭 데이터에 대해 질문할 수 있도록 지원합니다.

## Key Files

- `chatbot.module.ts` - NestJS module definition, imports MetricsModule and LLMModule
- `chatbot.controller.ts` - REST API endpoints for chat operations (`POST /api/chatbot/chat`, `GET /api/chatbot/sessions/:id`, `DELETE /api/chatbot/sessions/:id`)
- `chatbot.service.ts` - Core business logic: session management, page-to-metrics mapping, LLM integration
- `dto/chat.dto.ts` - Request/response DTOs for chat API
- `index.ts` - Module exports

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  ChatController │────▶│  ChatService    │────▶│  LLMService     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ MetricsService  │
                        └─────────────────┘
```

## Page-to-Metrics Mapping

The service maps page contexts to relevant metrics:
- `/dashboard/operations` → realtime, hourly, errorAnalysis
- `/dashboard/business` → tenantUsage, costTrend, heatmap
- `/dashboard/quality` → efficiencyTrend, correlation, repeatedPatterns
- `/dashboard/ai-performance` → tokenEfficiency, anomalyStats
- `/dashboard/chatbot-quality` → emergingPatterns, sentiment, rephrasedQueries

## For AI Agents

- **Session Management**: Sessions are stored in memory (Map<string, ChatSession>)
- **Multi-turn Context**: Last 10 messages are included in LLM context
- **Metrics Integration**: Reuses existing MetricsService for data fetching
- **LLM Integration**: Reuses existing LLMService from admin/analysis module

## Dependencies

- `MetricsModule` - For fetching dashboard metrics data
- `LLMModule` (from admin/analysis) - For AI response generation
- `crypto.randomUUID()` (Node.js built-in) - For session and message ID generation
