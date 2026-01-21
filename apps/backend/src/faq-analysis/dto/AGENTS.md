<!-- Parent: ../AGENTS.md -->
# DTO

## Purpose
FAQ 분석 API의 Data Transfer Object를 정의합니다. 요청/응답 데이터의 검증과 타입 정의를 담당합니다.

## Key Files
- `faq-analysis.dto.ts` - FAQ 분석 요청/응답 DTO (테넌트, 기간, 클러스터 설정 등)

## For AI Agents
- DTO 클래스에 class-validator 데코레이터 사용
- API 요청 파라미터 추가 시 여기에 정의
- 프론트엔드 `@ola/shared-types`와 타입 일관성 유지

## Dependencies
- class-validator, class-transformer
- `interfaces/` 디렉토리의 인터페이스 타입
