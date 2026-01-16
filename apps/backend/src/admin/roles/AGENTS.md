<!-- Parent: ../AGENTS.md -->
# Roles Module

## Purpose
관리자 역할(Role) 관리 모듈. RBAC(역할 기반 접근 제어)를 위한 역할 정의 및 권한 관리.

## Key Files
- `roles.module.ts` - NestJS 모듈 정의
- `roles.controller.ts` - REST API 엔드포인트 (/admin/roles)
- `roles.service.ts` - 역할 관리 비즈니스 로직
- `index.ts` - 모듈 익스포트

## Subdirectories
- `dto/` - 요청/응답 데이터 전송 객체

## For AI Agents
- 역할 정보는 Prisma를 통해 SQLite에 저장됨
- AuthModule의 RolesGuard와 연동

## Dependencies
- AdminModule (auth, database)
