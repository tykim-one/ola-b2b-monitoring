<!-- Parent: ../AGENTS.md -->
# Filters Module

## Purpose
관리자용 데이터 필터 관리 모듈. 대시보드에 표시할 데이터를 필터링하는 조건을 CRUD 관리합니다.

## Key Files
- `filters.module.ts` - NestJS 모듈 정의
- `filters.controller.ts` - REST API 엔드포인트 (/admin/filters)
- `filters.service.ts` - 필터 비즈니스 로직
- `index.ts` - 모듈 익스포트

## Subdirectories
- `dto/` - 요청/응답 데이터 전송 객체

## For AI Agents
- 필터 설정은 Prisma를 통해 SQLite에 저장됨
- JWT 인증 필요 (AdminGuard)

## Dependencies
- AdminModule (auth, database)
