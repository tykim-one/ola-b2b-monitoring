<!-- Parent: ../AGENTS.md -->
# hooks

## Purpose
React Query 및 UI 관련 커스텀 훅 모음입니다. 서버 상태(API 데이터)와 클라이언트 상태를 분리하여 관리합니다.

## Subdirectories
- `queries/` - React Query 기반 데이터 페칭 훅 (metrics, admin, dashboard)

## For AI Agents
- **서버 상태 분리**: API 데이터는 React Query 훅으로, UI 상태는 Zustand 스토어로 분리
- **훅 구조**: `use{도메인}.ts` 명명 규칙 따름
- **캐시 키**: 각 도메인별 `{domain}Keys` 객체로 쿼리 키 관리
- **새 훅 추가 시**: queries/ 디렉토리에 도메인별 파일 생성
