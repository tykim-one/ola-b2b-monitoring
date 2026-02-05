# 서비스 세부 페이지 구현 계획

> **새 세션 시작 프롬프트**: 아래 "다음 세션 프롬프트" 섹션 참조

## 개요

서비스 탭의 각 도메인별 세부 페이지 **10개**를 구현합니다.

| 항목 | 내용 |
|------|------|
| **접근 방식** | 기존 대시보드 페이지 컴포넌트 재사용 |
| **데이터 전략** | 서비스별 자동 필터링 (serviceId → projectId/tenantId 매핑) |
| **실행 방식** | 전체 동시 진행 (병렬 구현) |

---

## 현재 상태

### 이미 구현됨 ✅
```
apps/frontend-next/src/app/dashboard/services/[serviceId]/
├── page.tsx      ✅ 개요 페이지
└── layout.tsx    ✅ 탭 네비게이션 레이아웃
```

### 구현 필요 ❌
```
├── quality/page.tsx           ❌ 품질 분석
├── users/page.tsx             ❌ 유저 분석
├── ai-performance/page.tsx    ❌ AI 성능
├── batch-analysis/page.tsx    ❌ 배치 분석
├── status/page.tsx            ❌ 배치/처리 현황
├── data-loading/page.tsx      ❌ 데이터 적재
└── logs/page.tsx              ❌ 에러 로그
```

---

## 서비스 설정 (services.ts 기준)

| 서비스 ID | 이름 | 타입 | 메뉴 항목 |
|-----------|------|------|----------|
| `ibk-chat` | IBK 챗봇 | chatbot | quality, users, ai-performance, batch-analysis |
| `ibk` | IBK 리포트 | batch | status, data-loading |
| `wind-etl` | Wind ETL | pipeline | status, logs |
| `minkabu-etl` | Minkabu ETL | pipeline | status, logs |

---

## 구현 대상 페이지 상세 (10개)

### 1. IBK 챗봇 - 품질 분석 (`/services/ibk-chat/quality`)

**재사용 소스**: `apps/frontend-next/src/app/dashboard/quality/page.tsx`

**사용 API**:
- `GET /projects/{projectId}/api/quality/efficiency-trend`
- `GET /projects/{projectId}/api/quality/query-response-correlation`
- `GET /projects/{projectId}/api/quality/repeated-patterns`

**사용 컴포넌트**:
- `Dashboard` compound 컴포넌트
- `KPICard` (4개: 평균 효율성, 총 요청 수, 평균 응답 길이, FAQ 후보)
- `TokenEfficiencyTrendChart`
- `QueryResponseScatterPlot`
- `DataTable` (반복 질문 패턴)
- `FAQAnalysisSection`
- `DateRangeFilter`

**사용 훅**: `useQualityDashboard(projectId, days)`

**핵심 변경점**: `PROJECT_ID = 'ibks'` 하드코딩 → `useServiceContext()` 훅에서 동적 취득

---

### 2. IBK 챗봇 - 유저 분석 (`/services/ibk-chat/users`)

**재사용 소스**: `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`

**사용 API**:
- `GET /projects/{projectId}/api/analytics/user-list`
- `GET /projects/{projectId}/api/analytics/user-patterns`
- `GET /api/admin/problematic-chats/rules`
- `GET /api/admin/problematic-chats?days={days}&ruleIds={ruleIds}`
- `GET /api/admin/problematic-chats/stats?days={days}`

**사용 컴포넌트**:
- `Dashboard` compound 컴포넌트
- `DataTable` (유저 목록, 질문 패턴, 문제 채팅)
- `KPICard` (4개)
- `UserActivityDialog`
- `ProblematicChatDialog`
- `DateRangeFilter`

**사용 훅**:
- `useUserAnalyticsDashboard(projectId, days, enabled)`
- `useProblematicRules()`
- `useProblematicChats(days, ruleIds)`
- `useProblematicStats(days)`

**핵심 변경점**: `PROJECT_ID = 'ibks'` 하드코딩 → `useServiceContext()` 훅에서 동적 취득

---

### 3. IBK 챗봇 - AI 성능 (`/services/ibk-chat/ai-performance`)

**재사용 소스**: `apps/frontend-next/src/app/dashboard/operations/page.tsx`

**사용 API**:
- `GET /projects/{projectId}/api/metrics/realtime`
- `GET /projects/{projectId}/api/metrics/hourly`

**사용 컴포넌트**:
- `Dashboard` compound 컴포넌트
- `KPICard` (4개: 총 요청, 에러율, 평균 토큰, 활성 테넌트)
- `RealtimeTrafficChart`
- `ErrorGauge`
- `DateRangeFilter`

**사용 훅**: `useOperationsDashboard(projectId, days)`

**핵심 변경점**: `PROJECT_ID = 'ibks'` 하드코딩 → `useServiceContext()` 훅에서 동적 취득

---

### 4. IBK 챗봇 - 배치 분석 (`/services/ibk-chat/batch-analysis`)

**재사용 소스**: `apps/frontend-next/src/app/dashboard/admin/batch-analysis/page.tsx`

**사용 API**:
- `GET /api/admin/batch-analysis/jobs`
- `GET /api/admin/batch-analysis/results`
- `GET /api/admin/batch-analysis/stats`
- `GET /api/admin/batch-analysis/tenants`
- Session Analysis API 전체
- FAQ Analysis API 전체

**사용 컴포넌트**:
- 탭 구조 (ChatQualityTab, SessionAnalysisTab, FAQAnalysisTab)
- `CreateJobModal`
- 각종 테이블 및 차트

**참고**: 이 페이지는 기존 admin 페이지와 거의 동일하므로, 해당 경로로 리다이렉트하거나 컴포넌트를 import하여 사용

---

### 5. IBK 리포트 - 배치 현황 (`/services/ibk/status`)

**신규 구현** (batch-analysis API 활용)

**사용 API**:
- `GET /api/admin/batch-analysis/jobs?status=running`
- `GET /api/admin/batch-analysis/jobs?status=completed&limit=10`
- `GET /api/admin/batch-analysis/stats`
- `GET /api/admin/batch-analysis/schedules`

**표시 내용**:
- 실행 중인 작업 목록
- 최근 완료된 작업
- 작업 성공/실패 통계
- 다음 예정 작업 (스케줄)

**사용 컴포넌트**:
- `Dashboard` compound 컴포넌트
- `KPICard` (실행 중, 대기 중, 성공률, 평균 실행시간)
- `DataTable` (작업 목록)

---

### 6. IBK 리포트 - 데이터 적재 (`/services/ibk/data-loading`)

**신규 구현** (metrics API 활용)

**사용 API**:
- `GET /projects/{projectId}/api/metrics/daily` (일별 적재량 추정)
- `GET /projects/{projectId}/api/datasets` (데이터셋 목록)
- `GET /projects/{projectId}/api/tables/{datasetId}` (테이블 목록)

**표시 내용**:
- 일별 데이터 적재량 트렌드
- 데이터셋/테이블 목록
- 최신 데이터 시간

**사용 컴포넌트**:
- `Dashboard` compound 컴포넌트
- `KPICard` (오늘 적재량, 총 레코드, 최신 데이터 시간)
- `Chart` (일별 트렌드)
- `DataTable` (테이블 목록)

---

### 7. Wind ETL - 처리 현황 (`/services/wind-etl/status`)

**신규 구현** (wind-etl API 활용)

**사용 API**:
- `GET /api/wind-etl/runs` - 최근 실행 목록
- `GET /api/wind-etl/summary` - 실행 현황 요약
- `GET /api/wind-etl/trend/daily` - 일별 트렌드
- `GET /api/wind-etl/trend/hourly` - 시간별 트렌드
- `GET /api/wind-etl/stats/files` - 파일 처리 통계
- `GET /api/wind-etl/stats/records` - 레코드 처리 통계

**표시 내용**:
- 실시간 처리 상태 (처리 중, 대기 중, 완료)
- 최근 실행 목록
- 성공률, 평균 처리 시간
- 일별/시간별 처리량 트렌드 차트

**사용 컴포넌트**:
- `Dashboard` compound 컴포넌트
- `KPICard` (처리 중, 대기, 성공률, 오늘 처리량)
- `Chart` (트렌드 차트)
- `DataTable` (실행 목록)

---

### 8. Wind ETL - 에러 로그 (`/services/wind-etl/logs`)

**신규 구현** (wind-etl API 활용)

**사용 API**:
- `GET /api/wind-etl/errors` - 에러 분석
- `GET /api/wind-etl/runs?filter=failed` - 실패한 실행 목록

**표시 내용**:
- 최근 에러 목록
- 에러 타입별 빈도
- 에러 상세 정보

**사용 컴포넌트**:
- `Dashboard` compound 컴포넌트
- `KPICard` (총 에러, 오늘 에러, 가장 빈번한 에러 타입)
- `DataTable` (에러 목록, 확장 가능)

---

### 9. Minkabu ETL - 번역 현황 (`/services/minkabu-etl/status`)

**Wind ETL 처리 현황과 동일 구조** (API 경로만 다름)

**사용 API**:
- `GET /api/minkabu-etl/runs`
- `GET /api/minkabu-etl/summary`
- `GET /api/minkabu-etl/trend/daily`
- `GET /api/minkabu-etl/trend/hourly`
- `GET /api/minkabu-etl/stats/headlines`
- `GET /api/minkabu-etl/stats/index`

---

### 10. Minkabu ETL - 에러 로그 (`/services/minkabu-etl/logs`)

**Wind ETL 에러 로그와 동일 구조** (API 경로만 다름)

**사용 API**:
- `GET /api/minkabu-etl/errors`
- `GET /api/minkabu-etl/runs?filter=failed`

---

## 공통 기반 작업

### 1. 서비스-프로젝트 매핑 설정 파일

**파일**: `apps/frontend-next/src/config/service-mapping.ts`

```typescript
export interface ServiceMapping {
  projectId: string;
  tenantId?: string;
  apiPrefix: string;
  etlApiPrefix?: string; // ETL 서비스용
}

export const SERVICE_PROJECT_MAPPING: Record<string, ServiceMapping> = {
  'ibk-chat': {
    projectId: 'ibks',
    tenantId: 'ibk',
    apiPrefix: '/projects/ibks/api',
  },
  'ibk': {
    projectId: 'ibks',
    apiPrefix: '/projects/ibks/api',
  },
  'wind-etl': {
    projectId: 'wind',
    apiPrefix: '/api/wind-etl',
    etlApiPrefix: '/api/wind-etl',
  },
  'minkabu-etl': {
    projectId: 'minkabu',
    apiPrefix: '/api/minkabu-etl',
    etlApiPrefix: '/api/minkabu-etl',
  },
};

export function getServiceMapping(serviceId: string): ServiceMapping | undefined {
  return SERVICE_PROJECT_MAPPING[serviceId];
}
```

### 2. useServiceContext 훅

**파일**: `apps/frontend-next/src/hooks/useServiceContext.ts`

```typescript
'use client';

import { useParams } from 'next/navigation';
import { getServiceMapping, type ServiceMapping } from '@/config/service-mapping';
import { getServiceConfig } from '@/config/services';
import type { ServiceConfig } from '@ola/shared-types';

export interface ServiceContext extends ServiceMapping {
  serviceId: string;
  config: ServiceConfig | undefined;
}

export function useServiceContext(): ServiceContext | null {
  const params = useParams();
  const serviceId = params?.serviceId as string | undefined;

  if (!serviceId) return null;

  const mapping = getServiceMapping(serviceId);
  const config = getServiceConfig(serviceId);

  if (!mapping) return null;

  return {
    serviceId,
    ...mapping,
    config,
  };
}
```

### 3. 서비스별 API 훅 팩토리

기존 훅들을 래핑하여 serviceContext를 자동으로 주입하는 패턴:

```typescript
// 예시: useServiceQualityDashboard
export function useServiceQualityDashboard(days: number) {
  const ctx = useServiceContext();
  return useQualityDashboard(ctx?.projectId || '', days);
}
```

---

## 구현 태스크 체크리스트

### Phase 1: 기반 작업 (3개)
- [ ] **1.1** `service-mapping.ts` 생성 - 서비스-프로젝트 매핑 설정
- [ ] **1.2** `useServiceContext.ts` 훅 생성
- [ ] **1.3** 기존 훅들에 projectId 파라미터 동적 지원 확인

### Phase 2: IBK 챗봇 페이지 (4개)
- [ ] **2.1** `quality/page.tsx` - 품질 분석 (quality 페이지 재사용)
- [ ] **2.2** `users/page.tsx` - 유저 분석 (user-analytics 페이지 재사용)
- [ ] **2.3** `ai-performance/page.tsx` - AI 성능 (operations 페이지 재사용)
- [ ] **2.4** `batch-analysis/page.tsx` - 배치 분석 (admin/batch-analysis 재사용)

### Phase 3: IBK 리포트 페이지 (2개)
- [ ] **3.1** `status/page.tsx` - 배치 현황 (신규)
- [ ] **3.2** `data-loading/page.tsx` - 데이터 적재 (신규)

### Phase 4: ETL 페이지 (4개)
- [ ] **4.1** Wind ETL `status/page.tsx` - 처리 현황 (신규)
- [ ] **4.2** Wind ETL `logs/page.tsx` - 에러 로그 (신규)
- [ ] **4.3** Minkabu ETL `status/page.tsx` - 번역 현황 (4.1 복제 + API 경로 변경)
- [ ] **4.4** Minkabu ETL `logs/page.tsx` - 에러 로그 (4.2 복제 + API 경로 변경)

### Phase 5: 검증 및 정리 (3개)
- [ ] **5.1** 모든 페이지 네비게이션 테스트 (탭 클릭 → 페이지 이동)
- [ ] **5.2** API 연동 확인 (데이터 표시 확인)
- [ ] **5.3** 반응형 레이아웃 확인

---

## 파일 생성 목록 (총 10개 파일)

```
apps/frontend-next/src/
├── config/
│   └── service-mapping.ts                     # 신규
├── hooks/
│   └── useServiceContext.ts                   # 신규
└── app/dashboard/services/[serviceId]/
    ├── quality/
    │   └── page.tsx                           # 신규
    ├── users/
    │   └── page.tsx                           # 신규
    ├── ai-performance/
    │   └── page.tsx                           # 신규
    ├── batch-analysis/
    │   └── page.tsx                           # 신규
    ├── status/
    │   └── page.tsx                           # 신규
    ├── data-loading/
    │   └── page.tsx                           # 신규
    └── logs/
        └── page.tsx                           # 신규
```

---

## 재사용할 기존 컴포넌트

| 컴포넌트 | 경로 | 용도 |
|----------|------|------|
| Dashboard | `@/components/compound/Dashboard` | 페이지 레이아웃 |
| DataTable | `@/components/compound/DataTable` | 테이블 표시 |
| Chart | `@/components/compound/Chart` | 차트 표시 |
| KPICard | `@/components/kpi/KPICard` | KPI 카드 |
| DateRangeFilter | `@/components/ui/DateRangeFilter` | 날짜 필터 |
| TokenEfficiencyTrendChart | `@/components/charts/TokenEfficiencyTrendChart` | 효율성 트렌드 |
| QueryResponseScatterPlot | `@/components/charts/QueryResponseScatterPlot` | 상관관계 차트 |
| RealtimeTrafficChart | `@/components/charts/RealtimeTrafficChart` | 트래픽 차트 |
| ErrorGauge | `@/components/charts/ErrorGauge` | 에러 게이지 |
| FAQAnalysisSection | `@/components/faq-analysis/FAQAnalysisSection` | FAQ 분석 |
| UserActivityDialog | `@/components/charts/UserActivityDialog` | 유저 활동 |
| ProblematicChatDialog | `@/components/charts/ProblematicChatDialog` | 문제 채팅 |

---

## 재사용할 기존 훅

| 훅 | 경로 | 용도 |
|----|------|------|
| useQualityDashboard | `@/hooks/queries/use-quality` | 품질 대시보드 |
| useOperationsDashboard | `@/hooks/queries/use-dashboard` | 운영 대시보드 |
| useUserAnalyticsDashboard | `@/hooks/queries/use-user-analytics` | 유저 분석 |
| useProblematicRules | `@/hooks/queries/use-user-analytics` | 문제 채팅 규칙 |
| useProblematicChats | `@/hooks/queries/use-user-analytics` | 문제 채팅 |
| useProblematicStats | `@/hooks/queries/use-user-analytics` | 문제 채팅 통계 |

---

## 다음 세션 프롬프트

아래 프롬프트를 복사하여 새 세션에서 사용하세요:

```
서비스 세부 페이지 구현을 시작합니다.

계획 파일: .sisyphus/plans/service-detail-pages-implementation.md

이 계획에 따라 10개의 세부 페이지를 구현해주세요:

1. 먼저 기반 작업 (service-mapping.ts, useServiceContext.ts)
2. IBK 챗봇 4개 페이지 (quality, users, ai-performance, batch-analysis)
3. IBK 리포트 2개 페이지 (status, data-loading)
4. ETL 4개 페이지 (wind-etl/status, wind-etl/logs, minkabu-etl/status, minkabu-etl/logs)

병렬로 진행하되, 기반 작업 완료 후 페이지 구현을 시작하세요.
각 페이지는 기존 대시보드 컴포넌트를 재사용하고, useServiceContext 훅으로 projectId를 동적으로 취득합니다.
```

---

## 주의사항

1. **하드코딩된 PROJECT_ID 제거**: 기존 페이지들은 `const PROJECT_ID = 'ibks'`로 하드코딩되어 있음. 이를 `useServiceContext()` 훅으로 교체해야 함.

2. **서비스별 API 경로 차이**:
   - IBK 계열: `/projects/{projectId}/api/*`
   - ETL 계열: `/api/{service-id}/*`

3. **탭 네비게이션 활성 상태**: 현재 `layout.tsx`에서 활성 탭 하이라이트가 없음. 필요시 `usePathname()` 훅으로 현재 경로 확인하여 활성 상태 표시 추가.

4. **에러 처리**: 서비스 컨텍스트가 없을 경우 적절한 에러 메시지 표시.

---

## 예상 소요 시간

| Phase | 내용 | 예상 시간 |
|-------|------|----------|
| Phase 1 | 기반 작업 | 30분 |
| Phase 2 | IBK 챗봇 4개 | 1.5시간 |
| Phase 3 | IBK 리포트 2개 | 1시간 |
| Phase 4 | ETL 4개 | 1.5시간 |
| Phase 5 | 검증 | 30분 |
| **총합** | | **약 5시간** |
