# OLA B2B Monitoring 프로젝트 종합 코드 리뷰

**리뷰 일자**: 2026-01-15
**리뷰어**: Claude Code (AI Assistant)

---

## 전체 평가 요약

| 영역 | 점수 | 상태 |
|------|------|------|
| **보안** | 2/10 | CRITICAL |
| **타입 안전성** | 4/10 | HIGH |
| **코드 품질** | 5/10 | MEDIUM |
| **아키텍처** | 6/10 | MEDIUM |
| **성능** | 5/10 | MEDIUM |
| **프로덕션 준비도** | 3/10 | CRITICAL |

---

## CRITICAL 이슈 (즉시 해결 필요)

### 1. SQL 인젝션 취약점

**파일**: `apps/backend/src/bigquery/bigquery.controller.ts:19-27`

```typescript
@Post('query')
async executeQuery(@Body() queryDto: QueryDto) {
  // 사용자가 임의의 SQL 실행 가능!
}
```

**위험**: 누구나 `DROP TABLE`, 민감 데이터 조회 등 임의 SQL 실행 가능

**해결**: 엔드포인트 제거 또는 화이트리스트 방식으로 변경

---

### 2. 인증/인가 완전 부재

모든 API가 공개 상태입니다. JWT, API Key 등 인증 메커니즘이 전혀 없습니다.

**위험**: 누구나 모든 데이터에 접근 가능

---

### 3. 하드코딩된 localhost URL

**파일**: `apps/frontend-next/src/app/dashboard/operations/page.tsx:9` 외 다수

```typescript
const API_BASE = 'http://localhost:3000/projects/ibks/bigquery';
```

**위험**: 프로덕션 배포 시 작동 불가

**해결**: 환경변수 `NEXT_PUBLIC_API_URL` 사용

---

## HIGH 이슈

### 4. 타입 안전성 붕괴

| 문제 | 위치 | 영향 |
|------|------|------|
| `any` 타입 남용 | `bigquery.service.ts` 전체 | 런타임 에러 |
| shared-types 미사용 | Frontend 전체 | 타입 불일치 |
| 타입 정의 중복 | `operations/page.tsx`, `business/page.tsx` | 유지보수 어려움 |
| 타입 버그 | `shared-types/index.ts:87` `success: string` → `boolean` | 런타임 오류 |

### 5. 코드 중복

- `LogExplorer.tsx`와 `LogTableWidget.tsx`가 95% 동일
- Backend 메트릭 메서드 10개가 동일 패턴 반복

### 6. 에러 처리 미흡

- `catch (error)` 후 `error.message` 직접 접근 (타입 안전하지 않음)
- NestJS `HttpException` 미사용
- Frontend Error Boundary 없음

---

## MEDIUM 이슈

### 7. 캐싱 전략 문제

- "실시간" KPI에 5분 캐시 적용 (모순)
- 캐시 무효화 전략 부재
- `useClones: false`로 인한 잠재적 데이터 오염

### 8. DI 패턴 위반

```typescript
// 구체 클래스에 의존 (인터페이스에 의존해야 함)
private projectStrategy: DefaultProjectStrategy
```

### 9. 접근성(a11y) 미흡

- ARIA 레이블 누락
- 포커스 관리 없음
- `<label>` 연결 안 됨

### 10. 성능 최적화 부재

- 로그 테이블 가상화 없음 (대량 데이터 시 성능 저하)
- Recharts 항상 로드 (동적 import 미사용)
- 스켈레톤 로딩 없음 (레이아웃 시프트)

---

## Backend 상세 분석

### 코드 품질

#### 타입 안전성 문제 (any 남용)

| 파일 | 라인 | 문제점 |
|------|------|--------|
| `apps/backend/src/bigquery/bigquery.service.ts` | 43 | `executeQuery()` 반환 타입이 `any[]` |
| `apps/backend/src/bigquery/bigquery.service.ts` | 98 | `getSampleLogs()` 반환 타입이 `any[]` |
| `apps/backend/src/bigquery/bigquery.service.ts` | 118, 135, 151 등 | 모든 메트릭 메서드 반환 타입이 `any` 또는 `any[]` |
| `apps/backend/src/common/strategies/default.project.strategy.ts` | 7 | `parseLog(raw: any)` - 입력 타입 미정의 |

**진단**: shared-types에 `RealtimeKPI`, `HourlyTraffic` 등 타입이 정의되어 있음에도 Backend에서 활용하지 않고 있습니다.

#### 에러 처리 패턴 문제

**파일**: `apps/backend/src/bigquery/bigquery.service.ts:62-65`

```typescript
} catch (error) {
  this.logger.error(`Query execution failed: ${error.message}`, error.stack);
  throw new Error(`BigQuery query failed: ${error.message}`);
}
```

**문제점**:
1. `error`가 `unknown` 타입일 수 있는데 `.message`, `.stack`에 직접 접근
2. 원본 에러 정보(스택 트레이스)가 유실됨
3. NestJS의 `HttpException`을 사용하지 않아 적절한 HTTP 상태 코드 반환 불가

### BigQuery 연동

#### SQL 쿼리 파라미터화 부재

**파일**: `apps/backend/src/bigquery/queries/metrics.queries.ts:65-79`

```typescript
tenantUsage: (projectId: string, datasetId: string, tableName: string, days: number = 7) => `
  ...
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
  ...
`
```

`days` 파라미터가 직접 문자열에 삽입됩니다. BigQuery 파라미터화 쿼리(`@days` 형식)를 사용하는 것이 안전합니다.

#### 연결 관리 문제

**파일**: `apps/backend/src/bigquery/bigquery.service.ts:24-38`

- `OnModuleDestroy`를 구현하지 않아 클라이언트 정리가 없음
- 연결 실패시 재시도 로직 없음
- Health check 엔드포인트 없음

### 캐싱 구현

#### 메모리 누수 가능성

**파일**: `apps/backend/src/cache/cache.service.ts:25-31`

```typescript
this.cache = new NodeCache({
  stdTTL: CacheTTL.MEDIUM,
  checkperiod: 120,
  useClones: false,  // 문제점
  deleteOnExpire: true,
});
```

`useClones: false`는 성능 최적화이지만, 캐시된 객체를 외부에서 수정하면 캐시 데이터도 변경됩니다.

#### 캐시 무효화 전략 부재

- 데이터 변경시 관련 캐시만 선택적으로 무효화하는 메커니즘 없음
- 캐시 스탬피드(Stampede) 방지 로직 없음

### NestJS 패턴

#### 사용되지 않는 파라미터

여러 엔드포인트에서 `:projectId` 경로 파라미터가 선언되어 있지만 사용되지 않습니다:

| 라인 | 메서드 | 파라미터 |
|------|--------|----------|
| 36 | `getDatasets()` | projectId 미사용 |
| 50 | `getTables()` | projectId 미사용 |
| 87 | `getRealtimeKPI()` | projectId 미사용 |

멀티테넌트 구조를 고려한 설계로 보이나, 실제 구현은 단일 프로젝트만 지원합니다.

### 보안

#### 민감 정보 노출 가능성

**파일**: `apps/backend/src/bigquery/bigquery.service.ts:47`

```typescript
this.logger.log(`Executing query: ${query.substring(0, 100)}...`);
```

쿼리 내용이 로그에 기록됩니다. 민감한 데이터가 포함된 쿼리는 로그에 노출될 수 있습니다.

#### Service Account 파일 (주의)

`apps/backend/service-account.json` 파일에 **Private Key가 평문으로 저장**되어 있습니다.

**권장사항**:
- GCP Secret Manager 또는 Workload Identity Federation 사용
- 환경변수로 Base64 인코딩된 키 전달

### Anomaly Service 잠재적 성능 문제

**파일**: `apps/backend/src/ml/anomaly/anomaly.service.ts:66-72`

```typescript
for (const stat of stats) {
  const tenantData = recentData.filter(
    (d) => d.tenant_id === stat.tenant_id
  );
  for (const data of tenantData) {
    // ...
  }
}
```

O(n*m) 복잡도의 중첩 루프입니다. Map을 사용한 O(n+m) 최적화가 필요합니다.

---

## Frontend 상세 분석

### React/Next.js 패턴

#### Server/Client Component 오용

**파일**: `apps/frontend-next/src/app/dashboard/page.tsx:1-16`

```typescript
'use client';
import { useState, useEffect } from 'react';
...
useEffect(() => {
  setMetrics(generateMetrics());  // Generates mock data client-side
}, []);
```

**진단**: Client Component로 선언 후 `useEffect`로 데이터 로드. Next.js SSR 이점을 활용하지 못함.

#### 라우팅 충돌

| 파일 | 라인 | 동작 |
|------|------|------|
| `apps/frontend-next/src/app/page.tsx` | 3-4 | `/dashboard`로 redirect |
| `apps/frontend-next/src/middleware.ts` | 8-9 | `/ibks/logs`로 redirect |

middleware가 먼저 실행되어 충돌 발생.

#### 컴포넌트 중복

| File 1 | File 2 | Issue |
|--------|--------|-------|
| `apps/frontend-next/src/components/LogExplorer.tsx` | `apps/frontend-next/src/widgets/log-table-widget/ui/LogTableWidget.tsx` | ~95% 동일 코드 |

FSD (Feature-Sliced Design) 아키텍처로의 마이그레이션이 미완료된 것으로 보입니다.

### 데이터 페칭

#### 하드코딩된 URL 목록

| 파일 | 라인 | 하드코딩된 URL |
|------|------|---------------|
| `apps/frontend-next/src/app/logs/page.tsx` | 6 | `http://localhost:3000` |
| `apps/frontend-next/src/app/dashboard/operations/page.tsx` | 9 | `http://localhost:3000` |
| `apps/frontend-next/src/app/dashboard/business/page.tsx` | 10 | `http://localhost:3000` |
| `apps/frontend-next/src/app/dashboard/ai-performance/page.tsx` | 8 | `http://localhost:3000` |

올바른 패턴 (`apps/frontend-next/src/app/[projectId]/logs/page.tsx:11`):
```typescript
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

#### 데이터 페칭 라이브러리 부재

- raw `fetch` + `useEffect` 패턴 사용
- SWR/TanStack Query 미도입
- 요청 중복 제거 없음

#### 일관성 없는 새로고침 간격

```typescript
// operations/page.tsx
const interval = setInterval(fetchData, 5 * 60 * 1000);  // 5분
// business/page.tsx
const interval = setInterval(fetchData, 15 * 60 * 1000); // 15분
```

### 타입 안전성

#### 명시적 `any` 사용

| 파일 | 라인 | 코드 |
|------|------|------|
| `apps/frontend-next/src/components/LogExplorer.tsx` | 44 | `analyzeLogs(filteredLogs.slice(0, 20) as any)` |
| `apps/frontend-next/src/widgets/log-table-widget/ui/LogTableWidget.tsx` | 41 | 동일 |

#### 로컬 타입 정의가 shared-types와 중복

| 파일 | 라인 | 중복 타입 |
|------|-------|-----------------|
| `apps/frontend-next/src/app/dashboard/operations/page.tsx` | 11-19 | `KPIData` ≈ `RealtimeKPI` |
| `apps/frontend-next/src/app/dashboard/operations/page.tsx` | 21-28 | `HourlyData` ≈ `HourlyTraffic` |
| `apps/frontend-next/src/app/dashboard/business/page.tsx` | 12-21 | `TenantData` ≈ `TenantUsage` |
| `apps/frontend-next/src/app/dashboard/business/page.tsx` | 23-31 | `CostData` ≈ `CostTrend` |

### UI/UX

#### 접근성 이슈

| 파일 | 라인 | 요소 |
|------|------|---------|
| `apps/frontend-next/src/components/LogExplorer.tsx` | 57-71 | Button에 `aria-label` 없음 |
| `apps/frontend-next/src/components/Sidebar.tsx` | 95-107 | Navigation에 `aria-current` 없음 |
| `apps/frontend-next/src/components/LogExplorer.tsx` | 89-100 | Input에 `<label>` 연결 안 됨 |

#### suppressHydrationWarning 남용

| 파일 | 라인 |
|------|------|
| `apps/frontend-next/src/components/LogExplorer.tsx` | 118 |
| `apps/frontend-next/src/widgets/log-table-widget/ui/LogTableWidget.tsx` | 111 |

SSR/CSR 불일치 문제를 숨기는 것이 아닌 근본적 해결이 필요합니다.

### 성능

#### 리스트 가상화 없음

**파일**: `apps/frontend-next/src/components/LogExplorer.tsx:115-137`

```typescript
{filteredLogs.map((log, i) => (
  <tr key={log.id || i} ...>
```

대량 로그 데이터 시 성능 저하. `react-window` 도입 권장.

#### 차트 라이브러리 항상 로드

Recharts (180KB+)가 동적 import 없이 항상 로드됩니다.

### 보안

#### API 키 처리 (양호)

**파일**: `apps/frontend-next/src/services/geminiService.ts:1, 6-8`

```typescript
"use server";
...
const getClient = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
};
```

Server Action으로 올바르게 구현되어 API 키가 클라이언트에 노출되지 않습니다.

---

## 모노레포 구조 분석

### 문제점

#### TypeScript 버전 불일치

- Root: `~5.8.2`
- shared-types: `^5.0.0`
- backend: `^5.7.3`

#### 모듈 포맷 충돌

- shared-types: `"module": "CommonJS"`
- Apps: `"esnext"`, `"nodenext"` 사용

#### 빌드 순서 미보장

```json
"build": "pnpm -r build"
```

shared-types가 apps보다 먼저 빌드되어야 하지만 보장 안 됨.

#### 타입 정의 버그

**파일**: `packages/shared-types/src/index.ts:87`

```typescript
success: string  // 잘못됨! boolean이어야 함
```

BigQuery에서 BOOL 타입을 반환하므로 `boolean`이어야 합니다.

### 권장 수정사항

1. **빌드 스크립트 수정**:
```json
"build": "pnpm -r --filter='./packages/**' build && pnpm -r --filter='./apps/**' build"
```

2. **shared-types package.json에 exports 추가**:
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "require": "./dist/index.js",
    "import": "./dist/index.js"
  }
}
```

3. **TypeScript 프로젝트 참조 활성화**

---

## 아키텍처 평가

### 잘된 점

- pnpm 모노레포 구조 적절
- shared-types 패키지 분리
- NestJS 모듈 구조 기본적으로 양호
- Gemini API 키가 Server Action으로 보호됨
- BigQuery 쿼리 템플릿 분리 (`metrics.queries.ts`)

### 개선 필요

- TypeScript 설정 불일치 (CommonJS vs ESM)
- 빌드 순서 보장 안 됨
- FSD 아키텍처 마이그레이션 미완료
- 라우팅 충돌 (middleware vs page redirect)
- 인터페이스 기반 DI 미사용

---

## 권장 조치 우선순위

| 순위 | 항목 | 예상 공수 | 영향도 |
|------|------|----------|--------|
| **1** | SQL 인젝션 취약점 해결 - `/query` 엔드포인트 제거 또는 화이트리스트 | 1시간 | CRITICAL |
| **2** | 인증/인가 구현 (JWT 또는 API Key) | 4시간 | CRITICAL |
| **3** | localhost URL → 환경변수 | 30분 | CRITICAL |
| **4** | shared-types 실제 사용 및 타입 버그 수정 | 2시간 | HIGH |
| **5** | any 타입 제거 | 3시간 | HIGH |
| **6** | 중복 코드 통합 (LogExplorer) | 2시간 | MEDIUM |
| **7** | 에러 처리 표준화 (HttpException) | 2시간 | MEDIUM |
| **8** | 데이터 페칭 라이브러리 도입 (SWR/TanStack Query) | 3시간 | MEDIUM |
| **9** | 가상화/성능 최적화 (react-window) | 3시간 | MEDIUM |
| **10** | 테스트 코드 작성 | 8시간+ | LOW |
| **11** | Health Check 엔드포인트 추가 | 30분 | LOW |
| **12** | 접근성(a11y) 개선 | 2시간 | LOW |

---

## 결론

이 프로젝트는 **POC/초기 개발 단계**로 보이며, **프로덕션 배포 전 반드시 보안 이슈를 해결**해야 합니다. 특히 SQL 인젝션과 인증 부재는 심각한 보안 사고로 이어질 수 있습니다.

타입 시스템의 잠재력(shared-types 패키지)이 있음에도 불구하고 실제로 활용되지 않아, TypeScript의 핵심 이점을 누리지 못하고 있습니다.

**즉시 조치 필요 항목**:
1. SQL 인젝션 취약점 제거
2. 인증/인가 구현
3. 환경변수 기반 URL 설정

이 세 가지만 해결해도 프로덕션 배포 가능한 수준으로 보안이 개선됩니다.

---

*이 리뷰는 자동화된 코드 분석 및 AI 기반 검토를 통해 생성되었습니다.*
