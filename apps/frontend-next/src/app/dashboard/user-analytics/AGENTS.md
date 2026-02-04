<!-- Parent: ../AGENTS.md -->
# user-analytics

## Purpose
유저 분석 페이지입니다. x_enc_data 기준으로 유저별 활동을 추적하고 문제 채팅을 필터링합니다.

## Key Files
- `page.tsx` - 탭 인터페이스 (유저 목록 / 문제 채팅), KPI, 테이블, 다이얼로그
- `[userId]/page.tsx` - 유저 프로파일 상세 페이지 (활동, 카테고리, 감정)

## For AI Agents
- **유저 탭**: UserListItem, UserQuestionPattern 테이블, UserActivityDialog
- **문제 채팅 탭**: 규칙 필터 선택, ProblematicChat 테이블, ProblematicChatDialog
- **규칙 필터**: 활성화된 규칙 중에서 선택적으로 필터링 (체크박스 UI)
- **프로파일**: 카테고리 분포, 감정 분석, 세션 통계

## Dependencies
- Backend: `/api/admin/user-profiling/*`, `/api/admin/problematic-chats/*`
- Hooks: use-user-analytics.ts
- Dialogs: UserActivityDialog, ProblematicChatDialog
