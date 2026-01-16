<!-- Parent: ../AGENTS.md -->
# user-analytics

## Purpose
x_enc_data(유저 식별값) 기준 유저별 활동 분석 대시보드입니다. 유저 목록 테이블과 유저별 상세 활동 다이얼로그를 제공합니다.

## Key Files
- `page.tsx` - 유저 분석 대시보드 페이지
  - KPI 카드: 총 유저 수, 총 질문 수, 총 토큰 사용량, 유저당 평균 질문
  - UserListTable: 유저 목록 테이블 (정렬, 검색, 클릭시 다이얼로그 오픈)
  - UserPatternsTable: 자주 묻는 질문 패턴 테이블
  - UserActivityDialog: 유저 활동 상세 모달 (대화 이력, 기간 필터, 페이지네이션)

## For AI Agents
- 기간 선택 지원: 7일, 14일, 30일
- API 엔드포인트:
  - `/analytics/user-list` - 유저 목록 (통합 통계)
  - `/analytics/user-activity/:userId` - 유저 활동 상세 (대화 이력)
  - `/analytics/user-patterns` - 유저별 질문 패턴
- 15분마다 자동 새로고침
- userAnalyticsService.ts에서 API 호출

## Dependencies
- `@/services/userAnalyticsService` - API 클라이언트 (fetchUserList, fetchUserActivity)
- `@/components/charts/UserListTable` - 유저 목록 테이블
- `@/components/charts/UserActivityDialog` - 유저 활동 상세 다이얼로그
- `@/components/charts/UserPatternsTable` - 질문 패턴 테이블
- `@/components/kpi/KPICard` - KPI 카드
- `@ola/shared-types` - UserListItem, UserActivityDetail, UserQuestionPattern 타입
