<!-- Parent: ../AGENTS.md -->
# Contexts

## Purpose
React Context 전역 상태 관리.

## Key Files
- `AuthContext.tsx` - 인증 상태, login/logout, 권한 체크

## For AI Agents
- useAuth() 훅으로 인증 상태 접근
- hasPermission(permission) 메서드로 권한 확인
- Access Token은 메모리에 저장 (보안)
