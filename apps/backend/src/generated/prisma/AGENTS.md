<!-- Parent: ../AGENTS.md -->
# Prisma

## Purpose
Prisma CLI가 자동 생성한 클라이언트 코드입니다. Admin 모듈의 SQLite 데이터베이스 접근을 위한 타입 안전한 ORM 클라이언트를 제공합니다.

## Subdirectories
- `runtime/` - Prisma 런타임 라이브러리

## For AI Agents
- **절대 수동 편집 금지**: `pnpm prisma:generate` 명령으로 자동 생성
- 스키마 변경 시 재생성 필요
- 타입 참조만 가능: `import { PrismaClient } from './generated/prisma'`

## Dependencies
- `prisma/schema.prisma` 스키마 파일
- Prisma CLI
- @prisma/client
