<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# services/

## Purpose
서비스별 대시보드 컨테이너 디렉토리. 동적 라우팅 `[serviceId]`를 통해 개별 서비스(IBK 챗봇, IBK 리포트, Wind ETL, Minkabu ETL)의 전용 대시보드 페이지를 제공합니다.

## Key Files
(이 디렉토리에는 파일이 없으며, `[serviceId]` 동적 라우트만 포함)

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `[serviceId]/` | 서비스별 동적 라우트 (see `[serviceId]/AGENTS.md`) |

## For AI Agents
### Working In This Directory
- **동적 라우팅**: URL 경로 `/dashboard/services/:serviceId`는 `[serviceId]` 디렉토리로 매핑됨
- **서비스 설정**: `@/config/services.ts`에서 서비스 목록 및 메뉴 구조 정의
- **서비스 타입**:
  - `chatbot`: IBK 챗봇 (품질 분석, 유저 분석, AI 성능, 배치 분석, 비즈니스 분석)
  - `batch`: IBK 리포트 (배치 현황, 데이터 적재)
  - `pipeline`: Wind ETL, Minkabu ETL (처리 현황, 에러 로그)

## Dependencies
### Internal
- `@/config/services.ts` - 서비스 설정 및 메뉴 구조
- `[serviceId]/` - 서비스별 페이지 구현
