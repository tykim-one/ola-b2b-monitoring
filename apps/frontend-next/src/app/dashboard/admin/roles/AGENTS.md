<!-- Parent: ../AGENTS.md -->
# roles

## Purpose
역할/권한 관리 페이지입니다. RBAC (Role-Based Access Control) 시스템의 역할을 생성/수정/삭제합니다.

## Key Files
- `page.tsx` - 역할 카드 그리드, 권한 표시, 사용자 수 표시

## Subdirectories
- `components/` - RoleFormModal

## For AI Agents
- **권한 형식**: `resource:action` (예: `users:read`, `roles:write`, `analysis:execute`)
- **사용자 할당**: 역할별로 할당된 사용자 수 표시 (users API 연동)
- **삭제 주의**: 사용자가 할당된 역할 삭제 시 경고 메시지

## Dependencies
- Backend: `/api/admin/roles/*` (NestJS)
- Shared types: `@ola/shared-types` (Role, Permission)
- React Query: useRoles, useUsers, useDeleteRole
