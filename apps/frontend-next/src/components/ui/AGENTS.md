<!-- Parent: ../AGENTS.md -->
# UI Components

## Purpose
재사용 가능한 공통 UI 컴포넌트 모음. 모달, 다이얼로그, 입력 필드 등 기본 UI 요소.

## Key Files
- `Modal.tsx` - 기본 모달 컴포넌트 (오버레이, 닫기 버튼)
- `ConfirmDialog.tsx` - 확인/취소 다이얼로그 (삭제 확인 등)
- `SearchInput.tsx` - 검색 입력 필드 (돋보기 아이콘, 디바운스)
- `DateRangeFilter.tsx` - 날짜 범위 필터 (시작일/종료일 선택)
- `StatusBadge.tsx` - 상태 뱃지 컴포넌트 (active/inactive, success/error 등)
- `EmptyState.tsx` - 빈 상태 플레이스홀더 (아이콘 + 메시지)
- `StatsFooter.tsx` - 통계 푸터 컴포넌트 (전체 개수, 필터링 결과 등)

## For AI Agents
- 모든 컴포넌트는 다크 모드 스타일 적용 (bg-slate-800, text-white)
- Tailwind CSS 사용
- lucide-react 아이콘 사용
