<!-- Parent: ../AGENTS.md -->
# components

## Purpose
재사용 가능한 UI 컴포넌트들입니다. 대시보드, 차트, KPI 카드, 로그 탐색기 등을 포함합니다.

## Key Files
- `Dashboard.tsx` - 메인 대시보드 컴포넌트
- `Sidebar.tsx` - 네비게이션 사이드바
- `LogExplorer.tsx` - 로그 검색/탐색 컴포넌트
- `ArchitectureView.tsx` - 시스템 아키텍처 시각화

## Subdirectories
- `analysis/` - 분석 관련 컴포넌트
- `charts/` - Recharts 기반 차트 컴포넌트들
- `chatbot/` - 글로벌 플로팅 AI 챗봇 컴포넌트 (FloatingChatbot, ChatWindow, ChatMessage, ChatInput)
- `compound/` - Compound 컴포넌트 (Dashboard, DataTable, Chart)
- `kpi/` - KPI 카드 컴포넌트
- `markdown/` - Markdown 렌더링 컴포넌트 (LLM 응답용)
- `ui/` - 기본 UI 컴포넌트 (Modal, ConfirmDialog, SearchInput)

## For AI Agents
- 모든 컴포넌트는 'use client' 선언 (클라이언트 컴포넌트)
- 차트는 Recharts 라이브러리 사용
- 스타일링은 Tailwind CSS 클래스
- **Compound 패턴**: compound/ 의 컴포넌트는 Object.assign으로 서브컴포넌트 연결
- **재사용**: 새 대시보드 페이지 생성 시 compound/Dashboard 사용
