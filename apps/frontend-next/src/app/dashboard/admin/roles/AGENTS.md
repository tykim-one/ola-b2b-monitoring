<!-- Parent: ../AGENTS.md -->
# roles

## Purpose
역할 및 권한 관리 페이지입니다. RBAC 기반 권한 체계를 관리합니다.

## Key Files
- `page.tsx` - 역할 목록, 생성/수정/삭제

## Subdirectories
- `components/` - 역할 페이지 로컬 컴포넌트

## For AI Agents
- 라우트: `/dashboard/admin/roles`
- 권한 형식: `resource:action` (예: `users:read`, `metrics:write`)
