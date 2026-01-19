<!-- Parent: ../AGENTS.md -->

# Pages (Legacy)

레거시 Next.js Pages Router 디렉토리입니다.

## Purpose

Next.js Pages Router 방식의 페이지 컴포넌트를 포함합니다. 현재는 대부분의 기능이 `app/` 디렉토리 (App Router)로 마이그레이션되었습니다.

## Current Status

- 이 디렉토리는 레거시 Pages Router 방식을 사용합니다
- 새로운 페이지는 `app/` 디렉토리에 추가해야 합니다
- 기존 페이지는 점진적으로 App Router로 마이그레이션 예정

## Subdirectories

- [`log-viewer/`](./log-viewer/AGENTS.md) - 로그 뷰어 페이지 (레거시)

## Migration Notes

Pages Router → App Router 마이그레이션 시 주의사항:
- `getServerSideProps` → `async` 컴포넌트 + `fetch`
- `getStaticProps` → `async` 컴포넌트 + `fetch` (revalidate)
- `_app.tsx` → `app/layout.tsx`
- `_document.tsx` → `app/layout.tsx` (metadata)
- 파일 기반 라우팅 방식 동일

## For AI Agents

- **중요**: 새 페이지는 `app/` 디렉토리에 작성하세요
- 이 디렉토리는 하위 호환성을 위해 유지됩니다
- Pages Router 페이지를 수정해야 하는 경우에만 이 디렉토리를 사용하세요
- 가능하면 기존 페이지를 App Router로 리팩토링하세요
