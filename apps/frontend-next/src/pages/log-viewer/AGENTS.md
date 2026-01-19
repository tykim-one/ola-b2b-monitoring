<!-- Parent: ../AGENTS.md -->

# Log Viewer Page (Legacy)

로그 뷰어 페이지입니다 (레거시 Pages Router).

## Purpose

B2B LLM 로그 데이터를 테이블 형태로 조회하고 상세 내용을 확인합니다.

## Current Status

현재 디렉토리는 비어있으며, 향후 로그 뷰어 기능 구현 시 사용될 예정입니다.

## Planned Structure

```
log-viewer/
├── index.tsx              # 로그 뷰어 메인 페이지
├── components/
│   ├── LogTable.tsx       # 로그 테이블
│   ├── LogDetailModal.tsx # 로그 상세 모달
│   └── LogFilters.tsx     # 필터 UI
└── hooks/
    └── useLogData.ts      # 로그 데이터 페칭 훅
```

## Expected Features

- **로그 테이블**: 페이지네이션, 정렬, 필터링
- **로그 상세**: 클릭 시 모달로 전체 내용 표시
- **필터링**: 날짜, 테넌트, 성공/실패, 키워드
- **검색**: user_input, llm_response 전문 검색
- **내보내기**: CSV/JSON 형식으로 로그 다운로드

## Integration

- `features/log-filtering` 기능 모듈 사용
- `entities/log` 엔티티 사용
- BigQuery API 연동 (백엔드 `/api/logs` 엔드포인트)

## Migration Plan

향후 이 페이지는 App Router로 마이그레이션될 예정입니다:
- 목표 경로: `/app/dashboard/logs/page.tsx`
- React Server Components 활용
- Suspense + Streaming 적용

## For AI Agents

- 이 페이지는 아직 구현되지 않았습니다
- 로그 뷰어 기능 구현 시 **App Router** (`app/dashboard/logs/`) 에 구현하는 것을 권장합니다
- Pages Router 방식이 필요한 경우에만 이 디렉토리를 사용하세요
- BigQuery 플랫 스키마 참고 (CLAUDE.md 문서 참조)
