<!-- Parent: ../AGENTS.md -->
# Contexts

## Purpose
React Context 전역 상태 관리.

## Key Files
- `AuthContext.tsx` - 인증 상태, login/logout, 권한 체크
- `ChatbotContext.tsx` - 글로벌 플로팅 챗봇 상태 관리 (세션, 메시지, 열림/닫힘 상태)

## For AI Agents
- useAuth() 훅으로 인증 상태 접근
- hasPermission(permission) 메서드로 권한 확인
- Access Token은 메모리에 저장 (보안)
- useChatbot() 훅으로 챗봇 상태 접근 (isOpen, messages, sendMessage 등)
- ChatbotProvider는 providers.tsx에서 AuthProvider 내부에 래핑됨
