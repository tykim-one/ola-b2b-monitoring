<!-- Parent: ../AGENTS.md -->
# stores

## Purpose
Zustand 기반 클라이언트 UI 상태 관리 스토어입니다. 서버 상태(React Query)와 분리된 순수 UI 상태를 관리합니다.

## Key Files
- `ui-store.ts` - UI 상태 스토어 (사이드바, 모달, 선택된 아이템)

## For AI Agents
- **UI 상태만 관리**: 사이드바 열림/닫힘, 모달 상태, 선택된 아이템 등
- **서버 데이터 제외**: API 데이터는 React Query에서 관리
- **Selector 훅**: `useSidebar()`, `useModal()`, `useSelectedItem<T>()` 등 성능 최적화된 셀렉터 제공
- **DevTools**: `devtools` 미들웨어로 디버깅 지원
- **새 스토어 추가 시**: `use{도메인}Store.ts` 파일 생성, devtools 래핑 권장
