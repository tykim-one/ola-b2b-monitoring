<!-- Parent: ../AGENTS.md -->
# DTO

## Purpose
사용자 프로파일링 API의 Data Transfer Object를 정의합니다. 사용자별 분석 요청 파라미터를 검증합니다.

## Key Files
- `user-profile.dto.ts` - 사용자 프로필 요청 DTO

## For AI Agents
- 사용자 식별은 x_enc_data 필드 기반
- 프로필 조회 시 기간 필터 지원
- class-validator로 입력 검증

## Dependencies
- class-validator, class-transformer
- `interfaces/`의 프로파일 인터페이스
