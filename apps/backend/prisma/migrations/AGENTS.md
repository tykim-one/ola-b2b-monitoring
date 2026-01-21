<!-- Parent: ../AGENTS.md -->
# Migrations

## Purpose
Prisma 데이터베이스 마이그레이션 파일들을 보관합니다. Admin 모듈의 SQLite 스키마 변경 이력을 관리합니다.

## Key Files
- `migration_lock.toml` - 마이그레이션 잠금 파일
- `20260116071625_init/` - 초기 마이그레이션

## Subdirectories
- `20260116071625_init/` - 초기 스키마 마이그레이션

## For AI Agents
- **직접 수정 금지**: `pnpm prisma:migrate` 명령으로 생성
- 새 마이그레이션: `prisma migrate dev --name <name>`
- 마이그레이션 롤백은 수동으로 SQL 실행 필요

## Dependencies
- `../schema.prisma` 스키마 파일
- Prisma CLI
