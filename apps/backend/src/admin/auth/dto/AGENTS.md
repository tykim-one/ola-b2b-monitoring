<!-- Parent: ../AGENTS.md -->
# dto

## Purpose
인증 API 요청/응답 DTO(Data Transfer Object)입니다. class-validator로 검증됩니다.

## Key Files
- `login.dto.ts` - 로그인 요청 DTO (email, password)
- `refresh-token.dto.ts` - 토큰 갱신 요청 DTO (refreshToken)

## For AI Agents
- **class-validator**: @IsEmail(), @IsString(), @MinLength() 등 사용
- **ValidationPipe**: main.ts에서 전역 파이프로 자동 검증
- **새 DTO 추가 시**: class-validator 데코레이터 필수 적용
