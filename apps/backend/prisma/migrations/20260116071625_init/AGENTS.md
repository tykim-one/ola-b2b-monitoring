<!-- Parent: ../AGENTS.md -->
# 20260116071625_init

## Purpose
Prisma 초기 마이그레이션 - Admin 모듈의 SQLite 데이터베이스 스키마 초기화 SQL을 포함합니다.

## Key Files
- `migration.sql` - 초기 스키마 생성 SQL (12개 테이블)

## Tables Created
- `User` - 사용자 계정 (이메일, 비밀번호, 로그인 상태)
- `Role` - 역할 정의
- `Permission` - 권한 정의
- `UserRole` - 사용자-역할 매핑 (다대다)
- `RolePermission` - 역할-권한 매핑 (다대다)
- `RefreshToken` - JWT 리프레시 토큰 저장소
- `SavedFilter` - 사용자별 저장된 필터
- `AnalysisSession` - LLM 분석 세션
- `AnalysisMessage` - 분석 세션 메시지
- `AuditLog` - 감사 로그
- `ApiKey` - API 키 관리

## For AI Agents
- **직접 수정 금지**: Prisma 마이그레이션에 의해 자동 생성됨
- 스키마 변경 시 `../schema.prisma` 파일 수정 후 `pnpm prisma:migrate` 실행
- 이 파일은 역사 기록 목적이므로 편집하지 않음

## Dependencies
- `../../schema.prisma` - Prisma 스키마 정의 파일
