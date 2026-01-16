<!-- Parent: ../AGENTS.md -->
# lib

## Purpose
유틸리티 함수, 상수, 헬퍼 모듈, React Query 설정, Zod 스키마입니다.

## Key Files
- `api-client.ts` - Axios 기반 API 클라이언트 (authApi, usersApi, rolesApi, filtersApi, analysisApi)
- `query-client.ts` - React Query 클라이언트 설정 (TTL: SHORT/MEDIUM/LONG)
- `formatters.ts` - 데이터 포맷팅 유틸리티 (tokens, currency, date, percentage 등)
- `constants.ts` - 애플리케이션 상수 정의

## Subdirectories
- `schemas/` - Zod 폼 검증 스키마 (user, role, filter, analysis)

## For AI Agents
- 공통 유틸리티 함수는 이 디렉토리에 추가
- **포맷팅**: `formatters.ts`의 함수들 사용 (일관된 형식)
- **캐시 TTL**: query-client.ts의 CACHE_TIME 상수와 백엔드 CacheService TTL 일치
