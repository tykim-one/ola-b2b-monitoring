<!-- Parent: ../AGENTS.md -->
# user-analytics/

## Purpose
유저별 활동 분석 페이지. x_enc_data 기준으로 사용자별 사용 패턴, 카테고리 분포, 감정 분석을 제공합니다.

## Key Files
- `page.tsx` - 유저 목록 페이지 (사용자 검색, 필터링)
- `[userId]/page.tsx` - 유저 상세 분석 페이지 (프로필, 카테고리, 감정 분석)

## Subdirectories
- `[userId]/` - 동적 라우트 (특정 사용자 상세 페이지)

## For AI Agents
- **URL 경로**: `/dashboard/user-analytics` (목록), `/dashboard/user-analytics/{userId}` (상세)
- **주요 기능**:
  - 사용자 목록: DataTable로 검색 및 필터링
  - 사용자 상세: 프로필 카드, 카테고리 분포 차트, 감정 분석 트렌드
- **데이터 소스**: `/api/admin/user-profiling/:userId` API
- **카테고리**: LLM 기반 사용자 행동 분류 (쇼핑, 문의, 고객지원 등)

## Dependencies
- `@/hooks/queries` - useUserProfiling
- `@/components/compound/Dashboard`
- `@/components/charts/*` - CategoryPieChart, SentimentTrendChart
- `@ola/shared-types` - UserProfile, CategoryDistribution
