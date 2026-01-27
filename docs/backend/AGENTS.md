<!-- Parent: ../AGENTS.md -->
# backend

## Purpose
NestJS 백엔드 아키텍처 및 API 기술 문서.

## Key Files
- `ARCHITECTURE.md` - 모듈 구조, Three-Layer 패턴, 인증 흐름, 캐싱 전략
- `API_REFERENCE.md` - REST API 전체 엔드포인트 명세 (100+)
- `DATABASE_SCHEMA.md` - Prisma(SQLite) + BigQuery 스키마

## For AI Agents
- 백엔드 모듈 추가/변경 시 ARCHITECTURE.md 업데이트
- API 엔드포인트 추가 시 API_REFERENCE.md에 반영
- DB 스키마 변경 시 DATABASE_SCHEMA.md 업데이트
- apps/backend/src/ 코드와 일관성 유지

## Dependencies
- apps/backend/ 실제 코드와 동기화 필요
