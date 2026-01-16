<!-- Parent: ../AGENTS.md -->

# Analysis Page

AI-powered analysis chat interface for B2B monitoring data.

## Purpose

Provides an interactive chat experience where users can ask questions and receive intelligent insights about their B2B LLM monitoring data, including token usage, cost trends, tenant behavior, and anomaly detection.

## Key Files

### page.tsx
Main analysis page orchestrating the entire chat experience:
- State management for sessions and active session
- API integration with analysisService
- Auto-select most recent session on load
- Handles session CRUD operations (create, read, delete)
- Manages message sending with optimistic updates
- Three-column layout: SessionList | ChatInterface | MetricsContext

## Features

**Session Management**:
- List all user analysis sessions
- Create new sessions with auto-generated titles
- Delete sessions with confirmation
- Auto-select next available session on delete

**Chat Functionality**:
- Send messages to AI with optional metrics context
- Display message history with real-time updates
- Typing indicators while AI responds
- Error handling with input recovery

**Metrics Integration**:
- Optional metrics sidebar showing current system state
- Toggle visibility for focused conversation
- Fetches realtime KPI, top tenants, cost trends

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ SessionList (320px) │ ChatInterface (flex-1) │ MetricsContext │
│                     │                         │ (320px, toggle)│
│ - New Session       │ - Session Header        │ - Realtime KPI │
│ - Session 1 ✓       │ - Messages              │ - Top Tenants  │
│ - Session 2         │ - Input Area            │ - Cost Trend   │
│ - Session 3         │                         │                │
└─────────────────────────────────────────────────────────────┘
```

## User Flow

1. **Landing**: Auto-loads sessions, selects most recent
2. **New Session**: Click "+ New Analysis Session" → Creates session → Switches to it
3. **Chat**: Type message → (Optional) Toggle "Include metrics" → Press Enter/Click Send
4. **AI Response**: Typing indicator → AI response appears → Auto-scroll to bottom
5. **View Metrics**: Click "Show Metrics Context" → Sidebar slides in from right
6. **Switch Session**: Click session in list → Loads messages
7. **Delete Session**: Hover → Click ✕ → Click again to confirm → Session removed

## API Endpoints Used

All via `@/services/analysisService`:

```typescript
GET  /api/admin/analysis/sessions           // List sessions
POST /api/admin/analysis/sessions           // Create session
GET  /api/admin/analysis/sessions/:id       // Get session with messages
DELETE /api/admin/analysis/sessions/:id     // Delete session
POST /api/admin/analysis/sessions/:id/chat  // Send message
```

## State Management

**Local State** (useState):
- `sessions` - Array of all user sessions
- `activeSession` - Currently selected session with messages
- `showMetrics` - Boolean for metrics sidebar visibility
- `loading` - Loading state for initial fetch

**Optimistic Updates**:
- New messages appear immediately in UI
- Backend response updates with AI reply
- Session timestamps updated on message send

## For AI Agents

When modifying this page:
- Preserve three-column layout structure
- Maintain auto-select behavior for UX consistency
- Keep optimistic updates for responsiveness
- Handle edge cases (empty sessions, network errors, concurrent deletes)
- Test session switching with unsaved input

When adding features:
- Consider mobile layout (collapsible sidebars)
- Add loading states for all async operations
- Include error boundaries for API failures
- Update AGENTS.md documentation
- Test with multiple concurrent sessions

## Dependencies

- `@ola/shared-types` - AnalysisSession, AnalysisMessage, SendMessageRequest
- `@/components/analysis/*` - SessionList, ChatInterface, MetricsContext, MessageBubble
- `@/services/analysisService` - API client functions
