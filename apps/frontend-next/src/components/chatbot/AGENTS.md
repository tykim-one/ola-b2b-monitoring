<!-- Parent: ../AGENTS.md -->
# Chatbot Components

## Purpose

Floating AI chatbot UI components for the global dashboard assistant. These components render a draggable/resizable chat window accessible from any dashboard page.

## Key Files

- `index.ts` - Component exports
- `FloatingChatbot.tsx` - Main entry component with floating button and keyboard shortcut (Ctrl+K)
- `ChatWindow.tsx` - Draggable/resizable chat window with page context display
- `ChatMessage.tsx` - Individual message bubble with markdown rendering
- `ChatInput.tsx` - Message input field with send button

## Component Hierarchy

```
FloatingChatbot
├── Floating Button (toggle)
├── Keyboard Hint (Ctrl+K)
└── ChatWindow
    ├── Header (page context, clear, close)
    ├── Messages Area
    │   ├── Empty State (example questions)
    │   └── ChatMessage (for each message)
    └── ChatInput
```

## Features

- **Drag & Resize**: Window can be moved and resized
- **Page Context**: Shows current page name and provides relevant example questions
- **Keyboard Shortcut**: `Ctrl+K` or `Cmd+K` to toggle
- **Unread Indicator**: Badge shows message count when closed
- **Loading State**: Animated dots during AI response

## For AI Agents

- **State Management**: Uses `useChatbot()` hook from ChatbotContext
- **Styling**: Dark theme with slate colors, consistent with dashboard design
- **Icons**: Inline SVG icons (no external icon library dependency)
- **Example Questions**: Per-page question suggestions in `PAGE_EXAMPLES` object

## Dependencies

- `ChatbotContext` - Global chat state management
- No external UI libraries (pure React + Tailwind)
