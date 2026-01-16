# User Analytics - User List & Activity Detail Feature

## Overview
유저 분석 페이지에서 기존 차트(UserRequestsBarChart, UserTokensPieChart)를 제거하고, 전체 유저 목록 테이블과 유저별 상세 활동 다이얼로그를 추가합니다.

## Changes Summary

### 1. Frontend Changes

#### 1.1 Remove Components
- `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`
  - Remove `UserRequestsBarChart` import and usage (lines 6, 153-157)
  - Remove `UserTokensPieChart` import and usage (lines 7, 158-162)
  - Remove `fetchUserTokenUsage` import and state (lines 11, 20, 31, 56)

#### 1.2 New Components

**UserListTable** (`apps/frontend-next/src/components/charts/UserListTable.tsx`)
- 전체 유저 목록 테이블
- Columns: User ID, 질문수, 성공률, 총 토큰, 평균 토큰, 에러수, 첫 활동일, 마지막 활동일
- 행 클릭시 상세 다이얼로그 오픈
- 검색 필터 (SearchInput 재사용)
- 정렬 기능 (column header click)
- 기간 필터 자체 적용 (days prop)

**UserActivityDialog** (`apps/frontend-next/src/components/charts/UserActivityDialog.tsx`)
- Modal 컴포넌트 기반 (size: xl)
- 상단: 유저 요약 정보 (KPI cards style)
- 기간 필터: 일(1일)/주(7일 default)/월(30일) 셀렉터
- 활동 내역 테이블:
  - Columns: 시간, user_input (truncated, expandable), llm_response (truncated, expandable), 토큰, 성공여부
  - Expandable rows for full content
- 페이지네이션 (20개씩)

#### 1.3 Service Updates
**`apps/frontend-next/src/services/userAnalyticsService.ts`**
- Add `fetchUserList(projectId, days, limit)` → `UserListItem[]`
- Add `fetchUserActivity(projectId, userId, days, limit, offset)` → `UserActivityDetail[]`

#### 1.4 Page Updates
**`apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`**
- Import new components
- Add state: `selectedUserId`, `isDialogOpen`
- Replace charts grid with UserListTable
- Add UserActivityDialog with open/close handlers

### 2. Backend Changes

#### 2.1 New BigQuery Queries
**`apps/backend/src/metrics/queries/metrics.queries.ts`**

```typescript
// 유저 목록 (통합 통계)
userList: (projectId, datasetId, tableName, days, limit) => `
  SELECT
    request_metadata.x_enc_data AS userId,
    COUNT(*) AS questionCount,
    COUNTIF(success = TRUE) AS successCount,
    COUNTIF(success = FALSE) AS errorCount,
    ROUND(COUNTIF(success = TRUE) * 100.0 / NULLIF(COUNT(*), 0), 2) AS successRate,
    CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) AS totalTokens,
    ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) AS avgTokens,
    MIN(timestamp) AS firstActivity,
    MAX(timestamp) AS lastActivity
  FROM \`${projectId}.${datasetId}.${tableName}\`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
    AND request_metadata.x_enc_data IS NOT NULL
  GROUP BY userId
  ORDER BY questionCount DESC
  LIMIT ${limit}
`

// 유저 활동 상세
userActivityDetail: (projectId, datasetId, tableName, userId, days, limit, offset) => `
  SELECT
    timestamp,
    user_input AS userInput,
    llm_response AS llmResponse,
    CAST(COALESCE(CAST(input_tokens AS FLOAT64), 0) AS INT64) AS inputTokens,
    CAST(COALESCE(CAST(output_tokens AS FLOAT64), 0) AS INT64) AS outputTokens,
    CAST(COALESCE(CAST(total_tokens AS FLOAT64), 0) AS INT64) AS totalTokens,
    success
  FROM \`${projectId}.${datasetId}.${tableName}\`
  WHERE request_metadata.x_enc_data = '${userId}'
    AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
  ORDER BY timestamp DESC
  LIMIT ${limit} OFFSET ${offset}
`
```

#### 2.2 DataSource Interface
**`apps/backend/src/datasource/interfaces/metrics-datasource.interface.ts`**
- Add `getUserList(days?, limit?): Promise<UserListItem[]>`
- Add `getUserActivityDetail(userId, days?, limit?, offset?): Promise<UserActivityDetail[]>`

#### 2.3 BigQuery Implementation
**`apps/backend/src/datasource/implementations/bigquery-metrics.datasource.ts`**
- Implement `getUserList()` method
- Implement `getUserActivityDetail()` method

#### 2.4 Service Layer
**`apps/backend/src/metrics/metrics.service.ts`**
- Add `getUserList()` with MEDIUM cache (15min)
- Add `getUserActivityDetail()` with SHORT cache (5min)

#### 2.5 Controller Endpoints
**`apps/backend/src/metrics/metrics.controller.ts`**
```typescript
// GET /projects/:projectId/api/analytics/user-list?days=7&limit=1000
@Get('analytics/user-list')
getUserList(@Query('days') days = 7, @Query('limit') limit = 1000)

// GET /projects/:projectId/api/analytics/user-activity/:userId?days=7&limit=20&offset=0
@Get('analytics/user-activity/:userId')
getUserActivityDetail(@Param('userId') userId, @Query('days') days = 7, @Query('limit') limit = 20, @Query('offset') offset = 0)
```

### 3. Shared Types

**`packages/shared-types/src/index.ts`**
```typescript
/** 유저 목록 아이템 */
export interface UserListItem {
  userId: string;
  questionCount: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  totalTokens: number;
  avgTokens: number;
  firstActivity: string;
  lastActivity: string;
}

/** 유저 활동 상세 */
export interface UserActivityDetail {
  timestamp: string;
  userInput: string;
  llmResponse: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  success: boolean;
}
```

## File Changes Summary

| File | Action |
|------|--------|
| `packages/shared-types/src/index.ts` | Add UserListItem, UserActivityDetail types |
| `apps/backend/src/metrics/queries/metrics.queries.ts` | Add userList, userActivityDetail queries |
| `apps/backend/src/datasource/interfaces/metrics-datasource.interface.ts` | Add 2 new methods |
| `apps/backend/src/datasource/implementations/bigquery-metrics.datasource.ts` | Implement 2 new methods |
| `apps/backend/src/metrics/metrics.service.ts` | Add 2 service methods with caching |
| `apps/backend/src/metrics/metrics.controller.ts` | Add 2 new endpoints |
| `apps/frontend-next/src/services/userAnalyticsService.ts` | Add 2 fetch functions |
| `apps/frontend-next/src/components/charts/UserListTable.tsx` | **NEW** - User list table |
| `apps/frontend-next/src/components/charts/UserActivityDialog.tsx` | **NEW** - Activity detail dialog |
| `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx` | Remove charts, add table & dialog |

## Implementation Order

1. **Shared Types** - Add new interfaces
2. **Backend Queries** - Add BigQuery queries
3. **Backend DataSource** - Interface + Implementation
4. **Backend Service & Controller** - API endpoints
5. **Frontend Service** - API client functions
6. **Frontend Components** - UserListTable, UserActivityDialog
7. **Frontend Page** - Integrate components

## Verification

1. **Backend Test**
   - `curl http://localhost:3000/projects/ibks/api/analytics/user-list?days=7`
   - `curl http://localhost:3000/projects/ibks/api/analytics/user-activity/{userId}?days=7`

2. **Frontend Test**
   - Navigate to `/dashboard/user-analytics`
   - Verify user list table displays with all columns
   - Click a user row → dialog opens
   - Change dialog period filter (일/주/월) → data reloads
   - Verify expandable content for long user_input/llm_response

3. **Build Verification**
   - `pnpm build` - no type errors
   - `pnpm lint` - no lint errors
