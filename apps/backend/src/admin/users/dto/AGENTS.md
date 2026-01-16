<!-- Parent: ../AGENTS.md -->
# Users DTOs

## Purpose
사용자 관리 API의 요청/응답 데이터 전송 객체.

## Key Files
- `create-user.dto.ts` - 사용자 생성 요청 DTO
- `update-user.dto.ts` - 사용자 수정 요청 DTO

## For AI Agents
- class-validator 데코레이터 사용
- 비밀번호 필드는 @MinLength 등 검증 적용
