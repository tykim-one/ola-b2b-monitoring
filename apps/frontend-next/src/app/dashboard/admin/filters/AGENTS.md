<!-- Parent: ../AGENTS.md -->
# filters

## Purpose
저장된 필터 관리 페이지입니다. 자주 사용하는 검색 조건을 저장하고 기본 필터를 설정할 수 있습니다.

## Key Files
- `page.tsx` - 필터 목록 카드 그리드, 검색, CRUD, 기본 필터 설정

## Subdirectories
- `components/` - FilterFormModal

## For AI Agents
- **필터 기준**: dateRange, tenantIds, severities, minTokens, maxTokens, searchQuery 등
- **기본 필터**: 사용자당 1개의 필터를 기본으로 설정 가능 (isDefault 플래그)
- **적용**: 대시보드에서 저장된 필터를 불러와 빠르게 데이터 필터링

## Dependencies
- Backend: `/api/admin/filters/*` (NestJS)
- Shared types: `@ola/shared-types` (SavedFilter)
- React Query: useFilters, useDeleteFilter, useSetDefaultFilter
