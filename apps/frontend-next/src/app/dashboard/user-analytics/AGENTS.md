<!-- Parent: ../AGENTS.md -->
# user-analytics

## Purpose
사용자 활동 분석 페이지입니다. x_enc_data 기준으로 사용자별 LLM 사용 패턴, 토큰 분포, 활동 이력을 분석합니다.

## Key Files
- `page.tsx` - 사용자 활동 분석 메인 (UserListTable, UserTokensPieChart, UserRequestsBarChart 등)

## Subdirectories
- `[userId]/` - 개별 사용자 프로필 상세 페이지

## For AI Agents
- 라우트: `/dashboard/user-analytics`
- userAnalyticsService로 사용자 데이터 조회
- UserActivityDialog로 상세 활동 모달
