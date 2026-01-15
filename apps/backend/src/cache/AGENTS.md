<!-- Parent: ../AGENTS.md -->
# cache

## Purpose
node-cache 기반 인메모리 캐싱 서비스입니다. BigQuery 쿼리 결과를 캐싱하여 API 응답 속도를 향상시킵니다.

## Key Files
- `cache.module.ts` - 캐시 모듈 정의 (Global 모듈)
- `cache.service.ts` - 캐시 서비스 (getOrSet 패턴, TTL 관리)

## For AI Agents
- **TTL 상수**: `CacheTTL.SHORT`(5분), `CacheTTL.MEDIUM`(15분), `CacheTTL.LONG`(1시간)
- **캐시 키 생성**: `CacheService.generateKey('prefix', 'part1', 'part2')`
- **사용 패턴**: `cacheService.getOrSet(key, fetchFn, ttl)`
- 전역 모듈로 설정되어 있어 어디서든 주입 가능
