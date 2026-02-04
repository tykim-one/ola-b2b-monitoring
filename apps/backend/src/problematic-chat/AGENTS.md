<!-- Parent: ../AGENTS.md -->
# problematic-chat

## Purpose
동적 규칙 엔진 기반 문제 채팅 탐지 모듈입니다. 사용자 정의 규칙을 통해 BigQuery 로그에서 문제가 있는 채팅을 필터링하고 모니터링합니다.

## Key Files
- `problematic-chat.module.ts` - NestJS 모듈 선언, AdminModule/CacheModule/DataSourceModule import
- `problematic-chat.service.ts` - 규칙 CRUD, 문제 채팅 탐지, 동적 SQL WHERE 절 생성, 통계 집계
- `problematic-chat.controller.ts` - REST API 컨트롤러 (규칙 관리 + 채팅 조회 엔드포인트)

## Subdirectories
- `dto/` - 데이터 전송 객체 (규칙 생성/수정, 필터링 DTO) (see dto/AGENTS.md)
- `interfaces/` - 핵심 인터페이스 정의 (규칙 설정, 파싱된 규칙, 채팅 아이템) (see interfaces/AGENTS.md)

## For AI Agents
- 규칙 설정은 `{field, operator, value}` 구조를 사용하며, `@ola/shared-types`의 RULE_FIELDS/RULE_OPERATORS와 연동
- 동적 SQL 생성 시 contains, contains_any, lt, gt, eq 등의 연산자 지원
- 캐싱은 CacheService의 SHORT/MEDIUM TTL 사용
- 이전 규칙 포맷에서 새 포맷으로의 자동 마이그레이션 지원

## Dependencies
- `AdminModule` - Prisma DB 접근 (규칙 저장)
- `CacheModule` - 규칙 및 결과 캐싱
- `DataSourceModule` - BigQuery 데이터소스 접근
- `@ola/shared-types` - 규칙 필드/연산자 공유 타입
