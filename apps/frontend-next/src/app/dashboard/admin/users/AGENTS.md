<!-- Parent: ../AGENTS.md -->
# users

## Purpose
사용자 관리 페이지입니다. 시스템 사용자 CRUD, 역할 할당, 활성화/비활성화 기능을 제공합니다.

## Key Files
- `page.tsx` - 사용자 테이블 (DataTable 컴포넌트 사용), 검색, 상태 표시

## Subdirectories
- `components/` - UserFormModal

## For AI Agents
- **상태 관리**: isActive 플래그로 사용자 활성화/비활성화
- **역할 할당**: 여러 역할을 동시에 할당 가능 (many-to-many 관계)
- **마지막 로그인**: lastLoginAt 표시 (JWT 인증 시 업데이트)
- **DataTable**: compound/DataTable 컴포넌트 사용 (정렬, 페이지네이션)

## Dependencies
- Backend: `/api/admin/users/*` (NestJS)
- Shared types: `@ola/shared-types` (User, Role)
- React Query: useUsers, useRoles, useDeleteUser
- Compound Components: DataTable
