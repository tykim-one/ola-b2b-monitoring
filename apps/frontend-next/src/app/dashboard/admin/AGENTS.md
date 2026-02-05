<!-- Parent: ../AGENTS.md -->
# admin/

## Purpose
관리자 전용 기능 페이지들. 사용자 관리, 역할 관리, 필터 관리, LLM 분석, 배치 분석 등을 포함합니다.

## Key Files
없음 (하위 디렉토리만 존재)

## Subdirectories
- `users/` - 사용자 관리 CRUD (생성, 수정, 삭제, 검색)
- `roles/` - 역할/권한 관리 CRUD
- `filters/` - 저장된 필터 관리
- `analysis/` - LLM 분석 세션 (Gemini 연동)
- `batch-analysis/` - 배치 분석 파이프라인 (채팅 품질, FAQ, 세션 분석)
- `problematic-rules/` - 문제 규칙 관리

## For AI Agents
- **URL 경로**: `/dashboard/admin/*`
- **인증**: JWT 토큰 필수 (AuthContext)
- **권한**: RBAC 기반 권한 체크 (백엔드에서 PermissionsGuard)
- **공통 패턴**:
  - DataTable 컴포넌트로 CRUD 테이블 구현
  - FormModal로 생성/수정 폼 표시
  - ConfirmDialog로 삭제 확인
  - React Query의 useQuery/useMutation 사용
  - 액션 버튼: Plus (생성), Pencil (수정), Trash2 (삭제)
- **스타일**: 플랫 디자인 (variant="flat"), 사이버펑크 악센트 색상

## Dependencies
- `@/hooks/queries` - useUsers, useRoles, useDeleteUser 등 API 훅
- `@/components/ui/*` - SearchInput, ConfirmDialog, StatsFooter 등
- `@/components/compound/DataTable` - 테이블 컴포넌트
- `@ola/shared-types` - User, Role 등 타입
