<!-- Parent: ../AGENTS.md -->
# Analysis DTOs

## Purpose
분석 세션 API의 요청/응답 데이터 전송 객체 정의.

## Key Files
- `create-session.dto.ts` - 분석 세션 생성 요청 DTO
- `send-message.dto.ts` - LLM 메시지 전송 요청 DTO

## For AI Agents
- class-validator 데코레이터 사용 (@IsString, @IsNotEmpty 등)
- NestJS ValidationPipe와 함께 작동
