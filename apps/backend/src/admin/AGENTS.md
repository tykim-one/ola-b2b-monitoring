<!-- Parent: ../AGENTS.md -->
# Admin Module

## Purpose
SQLite 기반 어드민 서비스 레이어. 사용자 인증(JWT), 역할 기반 접근 제어(RBAC), LLM 분석 기능을 제공합니다.

## Key Files
- `admin.module.ts` - 어드민 모듈 정의, 전역 가드 등록
- `index.ts` - 배럴 export

## Subdirectories
- `auth/` - JWT 인증, 가드, 데코레이터 (see auth/AGENTS.md)
- `database/` - Prisma 서비스, 데이터베이스 모듈 (see database/AGENTS.md)
- `users/` - 사용자 CRUD (see users/AGENTS.md)
- `roles/` - 역할/권한 CRUD (see roles/AGENTS.md)
- `filters/` - 저장된 필터 관리 (see filters/AGENTS.md)
- `analysis/` - LLM 분석 세션 (see analysis/AGENTS.md)

## For AI Agents
- JWT 토큰: Access 15분, Refresh 7일
- 전역 가드: JwtAuthGuard → PermissionsGuard → ThrottlerGuard
- @Public() 데코레이터로 인증 우회
- @Permissions('resource:action') 형식으로 권한 지정
- SQLite DB 위치: prisma/admin.db

## Dependencies
- Prisma ORM + libSQL adapter
- @nestjs/jwt, @nestjs/passport
- @google/generative-ai (Gemini)
