<!-- Parent: ../AGENTS.md -->
# DTO

## Purpose
세션 분석 API의 Data Transfer Object를 정의합니다. 세션 필터링, 페이지네이션 등의 요청 파라미터를 검증합니다.

## Key Files
- `session-filter.dto.ts` - 세션 필터 DTO (테넌트, 기간, 상태, 페이지네이션)
- `index.ts` - DTO export 인덱스

## For AI Agents
- 세션 목록 조회 시 필터 조건 정의
- class-validator 데코레이터로 입력 검증
- 프론트엔드 호출과 타입 일치 확인

## Dependencies
- class-validator, class-transformer
- `interfaces/`의 세션 관련 인터페이스
