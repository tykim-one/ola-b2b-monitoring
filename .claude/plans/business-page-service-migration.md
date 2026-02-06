# 비즈니스 분석 페이지 서비스별 동적 라우팅 마이그레이션

> 다음 세션에서 이 문서를 참고하여 구현을 진행하세요.
> 프롬프트: "`.claude/plans/business-page-service-migration.md` 문서를 읽고 구현을 진행해줘"

---

## 컨텍스트

### 원래 요청
비즈니스 분석 페이지(`/dashboard/business`)를 서비스별 동적 라우팅(`/dashboard/services/[serviceId]/business`)으로 마이그레이션

### 인터뷰 요약
- **메뉴 추가 범위**: `ibk-chat` 서비스에만 "비즈니스 분석" 메뉴 추가 (chatbot 타입만 해당)
- **사이드바 기존 항목**: `/dashboard/business` 링크 유지 (추후 글로벌 비교 대시보드용)
- **기존 business/page.tsx**: 삭제하지 않고 보존 (추후 글로벌 비교로 발전 예정)
- `ibk-chat`과 `ibk`는 동일한 projectId(`ibks`)이지만, `ibk`는 batch 타입이므로 LLM 토큰/비용 분석 대상 아님

### 리서치 결과 (코드베이스 분석)

**기존 비즈니스 페이지** (`apps/frontend-next/src/app/dashboard/business/page.tsx`):
- `PROJECT_ID = 'ibks'` 하드코딩
- `useBusinessDashboard(PROJECT_ID, dateRange.days)` 훅 사용
- 컴포넌트: TenantPieChart, CostTrendChart, UsageHeatmap, DataTable (테넌트별 상세)
- 4개 KPI: 총 토큰 사용량, 예상 비용, 총 요청 수, 활성 테넌트

**서비스 라우팅 패턴** (참고: `[serviceId]/status/page.tsx`):
- `useServiceContext()` 훅으로 `{ serviceId, projectId, tenantId, apiPrefix, config }` 취득
- `config?.name` 또는 `serviceId`로 페이지 타이틀 동적 생성
- 서비스 컨텍스트 없을 시 에러 UI 표시 패턴 확립

**서비스 레이아웃** (`[serviceId]/layout.tsx`):
- `config.menu` 배열 기반으로 서브 네비게이션 자동 생성
- menu에 `{ id, label, path }` 추가하면 탭이 자동으로 나타남

**useBusinessDashboard 훅** (`hooks/queries/use-dashboard.ts`):
- 이미 `projectId`를 파라미터로 받음 -> 동적 서비스 대응 준비 완료
- 반환: `{ tenantUsage, costTrend, heatmap, kpis, isLoading, error, refetch }`

**서비스 매핑** (`config/service-mapping.ts`):
- `ibk-chat` -> `{ projectId: 'ibks', tenantId: 'ibk', apiPrefix: '/projects/ibks/api' }`

---

## 작업 목표

### 핵심 목표
`/dashboard/services/ibk-chat/business` 경로에서 비즈니스 분석 대시보드를 렌더링하되, `useServiceContext()`를 통해 projectId를 동적으로 가져와 하드코딩을 제거한다.

### 결과물
1. 새 페이지 파일: `apps/frontend-next/src/app/dashboard/services/[serviceId]/business/page.tsx`
2. 수정된 서비스 설정: `ibk-chat`의 menu에 business 항목 추가

### 완료 기준
- [x] `/dashboard/services/ibk-chat/business` 접근 시 비즈니스 분석 대시보드가 정상 렌더링
- [x] 서비스 레이아웃의 서브 네비게이션에 "비즈니스 분석" 탭 표시
- [x] `PROJECT_ID` 하드코딩 없이 `useServiceContext().projectId`로 동적 동작
- [x] 기존 `/dashboard/business` 페이지 영향 없음 (보존)
- [x] 사이드바 기존 "비즈니스 > 비용/사용량" 항목 영향 없음 (보존)
- [x] 빌드 에러 없음 (`pnpm build:frontend-next` 성공)

---

## 가드레일

### 반드시 포함 (Must Have)
- `useServiceContext()` 패턴으로 projectId 동적 취득
- 서비스 컨텍스트 없을 시 에러 UI (기존 status 페이지 패턴 따름)
- 기존 차트 컴포넌트 100% 재사용 (TenantPieChart, CostTrendChart, UsageHeatmap)
- `ibk-chat`의 menu 배열에 business 항목 추가

### 반드시 제외 (Must NOT Have)
- 기존 `/dashboard/business/page.tsx` 수정 또는 삭제 금지
- 사이드바(`Sidebar.tsx`)의 "비즈니스" 섹션 수정 금지
- `ibk`, `wind-etl`, `minkabu-etl`의 menu에 business 추가 금지
- 새로운 컴포넌트 생성 금지 (기존 컴포넌트 재사용)
- 백엔드 변경 금지 (프론트엔드만 변경)

---

## 태스크 흐름

```
[Task 1: 서비스 설정 수정] ──> [Task 2: 새 페이지 생성] ──> [Task 3: 빌드 검증]
```

의존 관계:
- Task 2는 Task 1에 의존 (menu 항목이 있어야 서브 네비에 탭이 나타남)
- Task 3은 Task 2에 의존 (페이지가 있어야 빌드 검증 가능)

---

## 상세 TODO

### Task 1: `ibk-chat` 서비스 설정에 비즈니스 메뉴 추가

**파일**: `apps/frontend-next/src/config/services.ts`
**위치**: `ibk-chat` 객체의 `menu` 배열 (line 24 부근)

**변경 내용**:
```typescript
// ibk-chat의 menu 배열에 추가
menu: [
  { id: 'quality', label: '품질 분석', path: '/quality' },
  { id: 'users', label: '유저 분석', path: '/users' },
  { id: 'ai-performance', label: 'AI 성능', path: '/ai-performance' },
  { id: 'batch-analysis', label: '배치 분석', path: '/batch-analysis' },
  { id: 'business', label: '비즈니스 분석', path: '/business' },  // <-- 추가
]
```

**검증 기준**:
- `ibk-chat`의 menu에만 추가되었는지 확인
- `ibk`, `wind-etl`, `minkabu-etl`의 menu는 변경 없는지 확인
- TypeScript 타입 에러 없음

---

### Task 2: 서비스별 비즈니스 분석 페이지 생성

**파일**: `apps/frontend-next/src/app/dashboard/services/[serviceId]/business/page.tsx` (새 파일)

**구현 패턴**: 기존 `business/page.tsx`를 기반으로 하되 아래 변경 적용

**변경 포인트 (기존 대비)**:

1. **PROJECT_ID 하드코딩 제거** -> `useServiceContext()` 사용:
```typescript
// 기존 (삭제)
const PROJECT_ID = 'ibks';
const { ... } = useBusinessDashboard(PROJECT_ID, dateRange.days);

// 변경
const ctx = useServiceContext();
// ctx null 체크 후
const { ... } = useBusinessDashboard(ctx.projectId, dateRange.days);
```

2. **서비스 컨텍스트 에러 처리** (status/page.tsx 패턴 참고):
```typescript
if (!ctx) {
  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
        <p className="text-rose-600">서비스 컨텍스트를 찾을 수 없습니다.</p>
      </div>
    </div>
  );
}
```

3. **페이지 타이틀 동적화**:
```typescript
// 기존
<Dashboard.Header title="비즈니스 분석" ... />

// 변경
<Dashboard.Header title={`${ctx.config?.name || ctx.serviceId} 비즈니스 분석`} ... />
```

4. **히트맵 타이틀 동적화**:
```typescript
// 기존
title={`시간대별 사용량 히트맵 (최근 ${dateRange.days}일)`}

// 변경 (동일 - 서비스명은 이미 페이지 헤더에 표시되므로 히트맵 제목에 중복 불필요)
title={`시간대별 사용량 히트맵 (최근 ${dateRange.days}일)`}
```

**그 외 모든 것은 기존 business/page.tsx와 동일**:
- import 구문 동일 (useServiceContext 추가만)
- dynamic import 패턴 동일 (TenantPieChart, CostTrendChart, UsageHeatmap)
- tenantColumns 정의 동일
- KPI 카드 4개 동일
- 차트 섹션 동일
- 데이터 테이블 동일

**검증 기준**:
- `/dashboard/services/ibk-chat/business` 접근 시 "IBK 챗봇 비즈니스 분석" 제목 표시
- KPI 4개, 차트 2개, 히트맵 1개, 테이블 1개 모두 렌더링
- 존재하지 않는 서비스 접근 시 에러 UI 표시
- `PROJECT_ID` 또는 `ibks` 하드코딩 없음

---

### Task 3: 빌드 검증

**명령어**: `cd apps/frontend-next && pnpm build`

**검증 기준**:
- 빌드 성공 (exit code 0)
- 새 페이지 라우트 생성 확인 (`/dashboard/services/[serviceId]/business`)
- 기존 `/dashboard/business` 라우트 유지 확인
- TypeScript 에러 없음
- 사용하지 않는 import 경고 없음

---

## 커밋 전략

단일 커밋으로 충분 (변경 파일 2개, 긴밀하게 연결된 변경):

```
feat(frontend): 비즈니스 분석 페이지를 서비스별 동적 라우팅으로 마이그레이션

- /dashboard/services/[serviceId]/business 경로에 새 페이지 추가
- PROJECT_ID 하드코딩 제거, useServiceContext()로 동적 projectId 취득
- ibk-chat 서비스 메뉴에 '비즈니스 분석' 탭 추가
- 기존 /dashboard/business 페이지는 글로벌 비교 대시보드용으로 보존
```

---

## 성공 기준 체크리스트

| 항목 | 검증 방법 |
|------|-----------|
| 새 페이지 렌더링 | `/dashboard/services/ibk-chat/business` 접근 확인 |
| 동적 projectId | 코드에 `'ibks'` 하드코딩 없음 |
| 서브 네비게이션 탭 | `ibk-chat` 서비스 헤더에 "비즈니스 분석" 탭 표시 |
| 기존 페이지 보존 | `/dashboard/business` 정상 접근 가능 |
| 사이드바 무변경 | 사이드바 "비즈니스 > 비용/사용량" 항목 유지 |
| 빌드 성공 | `pnpm build:frontend-next` exit code 0 |
| 다른 서비스 무영향 | `ibk`, `wind-etl`, `minkabu-etl` 메뉴 변경 없음 |

---

## 수정 파일 요약

| 파일 | 작업 | 변경량 |
|------|------|--------|
| `apps/frontend-next/src/config/services.ts` | ibk-chat menu에 business 항목 추가 | +1 line |
| `apps/frontend-next/src/app/dashboard/services/[serviceId]/business/page.tsx` | 새 파일 생성 | ~185 lines |

**총 변경**: 수정 1개 파일 + 신규 1개 파일
**백엔드 변경**: 없음
**위험도**: 낮음 (기존 코드 수정 최소, 새 파일 추가 위주)
