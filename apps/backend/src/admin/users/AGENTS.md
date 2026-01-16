<!-- Parent: ../AGENTS.md -->
# Users Module

## Purpose
관리자 사용자 계정 관리 모듈. 사용자 생성, 수정, 삭제, 역할 할당 등 계정 관리 기능 제공.

## Key Files
- `users.module.ts` - NestJS 모듈 정의
- `users.controller.ts` - REST API 엔드포인트 (/admin/users)
- `users.service.ts` - 사용자 관리 비즈니스 로직
- `index.ts` - 모듈 익스포트

## Subdirectories
- `dto/` - 요청/응답 데이터 전송 객체

## For AI Agents
- 비밀번호는 bcrypt로 해시 처리
- 사용자 정보는 Prisma를 통해 SQLite에 저장됨

## Dependencies
- AdminModule (auth, database)
- bcrypt
