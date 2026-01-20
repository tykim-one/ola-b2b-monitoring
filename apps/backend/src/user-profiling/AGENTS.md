<!-- Parent: ../AGENTS.md -->
# user-profiling

## Purpose
사용자 행동 프로파일링 모듈입니다. BigQuery 로그 데이터를 기반으로 사용자별 질문 카테고리 분류, 감정 분석, 행동 패턴을 분석합니다.

## Key Files
- `user-profiling.module.ts` - NestJS 모듈 정의
- `user-profiling.controller.ts` - API 엔드포인트
- `user-profiling.service.ts` - 메인 오케스트레이터 서비스
- `category-classifier.service.ts` - 질문 카테고리 분류 서비스
- `profile-generator.service.ts` - 사용자 프로필 생성 서비스

## Subdirectories
- `dto/` - 요청/응답 DTO (UserProfileDto)
- `interfaces/` - 타입 정의 (UserProfile, CategoryStats)

## API Endpoints
- `GET /api/admin/user-profiling/:userId` - 사용자 프로필 조회
- `GET /api/admin/user-profiling/:userId/categories` - 카테고리 분포
- `GET /api/admin/user-profiling/:userId/sentiment` - 감정 분석 결과

## For AI Agents
- LLM 서비스는 `admin/analysis/llm/LLMService` 사용
- BigQuery 쿼리는 서비스 내에서 직접 실행
- 캐싱 적용: 15분 TTL (CacheTTL.MEDIUM)
