<!-- Parent: ../AGENTS.md -->
# Database Module

## Purpose
Prisma ORM을 통한 SQLite 데이터베이스 연결.

## Key Files
- `database.module.ts` - Global 모듈
- `prisma.service.ts` - PrismaClient 확장, 어댑터 설정

## For AI Agents
- libSQL 어댑터 사용 (네이티브 빌드 불필요)
- DATABASE_URL 환경변수로 경로 설정
- cleanDatabase() 메서드로 테스트 시 초기화
