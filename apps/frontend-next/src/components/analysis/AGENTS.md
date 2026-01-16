<!-- Parent: ../AGENTS.md -->

# Analysis Components

This directory contains the React components for the LLM-powered AI analysis chat interface.

## Purpose

Provides interactive chat interface for users to analyze B2B monitoring data using AI assistance. Users can create sessions, ask questions, and receive intelligent insights about metrics, trends, and anomalies.

## Key Files

### ChatInterface.tsx
Main chat UI component featuring:
- Message history display with auto-scroll
- Input field with keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Loading indicators and typing animations
- Metrics context toggle
- Suggested prompts for empty sessions
- Gradient backgrounds and modern dark theme

### SessionList.tsx
Left sidebar component managing analysis sessions:
- Session creation/deletion
- Active session highlighting with gradient
- Timestamp formatting (relative time: "5m ago", "2h ago")
- Delete confirmation on double-click
- Empty state handling
- Scrollable session list

### MessageBubble.tsx
Individual message display component:
- Different styling for user vs assistant messages
- User: Blue gradient, aligned right
- AI: Slate gradient, aligned left, with markdown rendering
- Timestamp and metadata display (tokens, latency)
- Copy button for AI responses (visible on hover)
- Simple markdown parsing (headers, lists, bold)

### MetricsContext.tsx
Right sidebar panel showing current system metrics:
- Realtime KPI (requests, success rate, tokens, active tenants)
- Top 5 tenants by usage
- 7-day cost trend
- Collapsible with toggle button
- Auto-refresh capability
- Fetches data from API endpoints

## Component Hierarchy

```
AnalysisPage (dashboard/analysis/page.tsx)
├── SessionList
├── ChatInterface
│   └── MessageBubble (multiple)
└── MetricsContext
```

## Styling

**Aesthetic Direction**: Modern, gradient-driven dark theme with subtle animations

**Color Palette**:
- Background: slate-900, slate-800
- User messages: blue-600 to blue-700 gradient
- AI messages: slate-700 to slate-800 gradient
- Accents: purple-600, purple-700
- Borders: slate-600, slate-700

**Typography**:
- Headers: Bold, white
- Body text: slate-100, slate-200
- Metadata: slate-400, slate-500
- Code: Font-mono, slate-900 background

**Animations**:
- `animate-fade-in` for messages
- `animate-bounce` for typing indicator
- `animate-spin` for loading states
- Hover scale effects (1.02-1.05)
- Opacity transitions for buttons

## API Integration

All components interact with the backend via `@/services/analysisService`:

**Sessions**:
- `fetchSessions()` - List all user sessions
- `createSession(request)` - Create new analysis session
- `fetchSessionWithMessages(id)` - Get session with full message history
- `deleteSession(id)` - Delete session

**Chat**:
- `sendMessage(sessionId, request)` - Send user message and receive AI response

**Types**: Uses `@ola/shared-types` for type safety (AnalysisSession, AnalysisMessage, SendMessageRequest, SendMessageResponse)

## UX Features

1. **Keyboard Shortcuts**: Enter to send, Shift+Enter for multi-line
2. **Auto-scroll**: Messages automatically scroll to bottom
3. **Auto-focus**: Input field focuses on session switch
4. **Optimistic Updates**: Messages appear immediately
5. **Error Recovery**: Input restored on send failure
6. **Loading States**: Skeleton screens, spinners, typing indicators
7. **Empty States**: Helpful prompts and suggested questions
8. **Responsive**: Mobile-friendly (collapsible sidebars)

## For AI Agents

When modifying these components:
- Maintain consistent gradient styling (blue-purple theme)
- Preserve keyboard shortcuts and UX patterns
- Keep animations subtle (300ms transitions)
- Ensure accessibility (focus states, ARIA labels)
- Test auto-scroll behavior with long conversations
- Validate markdown rendering with various AI response formats

When adding features:
- Follow existing color palette and spacing
- Use Tailwind utility classes (avoid custom CSS)
- Add loading states for async operations
- Include empty states for zero-data scenarios
- Test on mobile viewports (320px+)

## Dependencies

- `@ola/shared-types` - Shared TypeScript types
- `react` - UI framework
- `next` - Server actions and routing
- `@/services/analysisService` - API client
