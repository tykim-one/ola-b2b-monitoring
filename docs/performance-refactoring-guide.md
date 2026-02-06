# 프론트엔드 성능 최적화 리팩토링 가이드

## 목적

OLA B2B Monitoring 대시보드의 로딩 속도와 렌더링 성능을 개선하기 위한 체크리스트 및 패턴 가이드입니다.

chatbot-quality, quality 페이지에 성공적으로 적용한 패턴을 다른 대시보드 페이지에 확장하기 위한 문서입니다. 각 패턴은 실제 구현체를 기반으로 작성되었으며, 복사-붙여넣기로 바로 적용할 수 있습니다.

---

## 체크리스트 (각 대시보드 페이지/차트 컴포넌트에 적용)

### 1. useMemo로 비용이 큰 계산 메모이제이션

#### 문제
filter, reduce, sort, map 등의 배열 연산이 부모 컴포넌트 리렌더링마다 재실행됩니다. 데이터가 크면 frame drop을 유발합니다.

#### 언제 적용하나?
- 배열에 `.filter()`, `.reduce()`, `.sort()`, `.map()`을 호출하는 곳
- 특히 데이터가 100개 이상인 경우
- KPI 계산 (합계, 평균, 카운트 등)
- 복잡한 변환 로직 (정규화, 분류, 정렬)

#### Before (안티패턴)
```tsx
const Component = ({ data }) => {
  // 매 렌더링마다 O(n) 재실행
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const filtered = data.filter(d => d.status === 'active');

  return (
    <div>
      <div>합계: {total}</div>
      <Chart data={sortedData} />
      <Table data={filtered} />
    </div>
  );
};
```

#### After (올바른 패턴)
```tsx
import { useMemo } from 'react';

const Component = ({ data }) => {
  const sortedData = useMemo(() =>
    [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data]
  );

  const total = useMemo(() =>
    data.reduce((sum, d) => sum + d.count, 0),
    [data]
  );

  const filtered = useMemo(() =>
    data.filter(d => d.status === 'active'),
    [data]
  );

  return (
    <div>
      <div>합계: {total}</div>
      <Chart data={sortedData} />
      <Table data={filtered} />
    </div>
  );
};
```

#### 참고 구현체
- `TokenEfficiencyTrendChart.tsx:47-58` — sortedData, avgEfficiency 메모이제이션
- `QueryResponseScatterPlot.tsx:49-67` — efficiency 분류(49-53), 피어슨 상관계수 계산(56-67)
- `use-quality.ts` — KPI 계산 (mean, median, stdDev, correlation)

#### 적용 필요 파일

| 파일 | 위치 | 내용 |
|------|------|------|
| `components/charts/RealtimeTrafficChart.tsx` | ~43-45 | sort() 메모이제이션 |
| `components/charts/TenantPieChart.tsx` | ~27-34 | reduce()+map() 메모이제이션 |
| `components/charts/CostTrendChart.tsx` | ~46-50 | sort()+reduce() 메모이제이션 |
| `components/charts/UsageHeatmap.tsx` | ~37-43 | 데이터 변환 및 그룹화 메모이제이션 |
| `app/dashboard/user-analytics/page.tsx` | ~352-359 | 3개 reduce + 1개 Set 계산 메모이제이션 |
| `app/dashboard/quality/page.tsx` | ~54 | totalOccurrences reduce 메모이제이션 |
| `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` | ~93-99 | chartData 메모이제이션 |

---

### 2. React.memo로 불필요한 리렌더링 방지

#### 문제
부모 컴포넌트가 리렌더되면 props가 바뀌지 않아도 자식 컴포넌트가 다시 렌더됩니다. Recharts 차트는 렌더링 비용이 높아 프레임 드롭을 유발합니다.

#### 언제 적용하나?
- Recharts 기반 차트 컴포넌트 (모두 적용)
- props로 데이터를 받아서 시각화하는 컴포넌트
- 렌더링 비용이 높은 컴포넌트
- 부모에서 여러 번 리렌더되는 컴포넌트

#### Before
```tsx
const MyChart: React.FC<ChartProps> = ({ data, title, color }) => {
  return (
    <Chart title={title}>
      <BarChart data={data}>
        <Bar dataKey="value" fill={color} />
      </BarChart>
    </Chart>
  );
};

export default MyChart; // ← 메모이제이션 없음
```

#### After
```tsx
const MyChart: React.FC<ChartProps> = React.memo(({
  data,
  title = '기본 제목',
  color = '#3b82f6'
}) => {
  return (
    <Chart title={title}>
      <BarChart data={data}>
        <Bar dataKey="value" fill={color} />
      </BarChart>
    </Chart>
  );
});

export default MyChart;
```

**주의**: props에 기본값을 설정하면 메모이제이션 효율이 올라갑니다.

#### ⚠️ 주의: 인라인 props가 React.memo를 무효화합니다

React.memo를 적용해도 부모 컴포넌트에서 **인라인 객체/배열/함수**를 props로 전달하면 매 렌더링마다 새로운 참조가 생성되어 메모이제이션이 무효화됩니다. 이는 React.memo의 가장 흔한 실패 원인입니다.

##### Before (memo 무효화)
```tsx
// 부모 컴포넌트 — 매 렌더링마다 새 배열/함수 참조 생성
<MyChart
  data={rawData.filter(d => d.status === 'active')}  // ← 매번 새 배열
  onClick={() => handleClick(id)}                      // ← 매번 새 함수
  style={{ color: 'blue' }}                            // ← 매번 새 객체
/>
```

##### After (memo 정상 작동)
```tsx
// 부모 컴포넌트 — 안정된 참조 전달
const activeData = useMemo(
  () => rawData.filter(d => d.status === 'active'),
  [rawData]
);
const handleChartClick = useCallback(() => handleClick(id), [id]);
const chartStyle = useMemo(() => ({ color: 'blue' }), []);

<MyChart data={activeData} onClick={handleChartClick} style={chartStyle} />
```

**규칙**: React.memo를 자식에 적용할 때는, 부모에서 전달하는 props도 `useMemo`/`useCallback`으로 안정화해야 합니다.

#### 참고 구현체
- `TokenEfficiencyTrendChart.tsx:42` — React.memo 적용됨
- `QueryResponseScatterPlot.tsx:39` — React.memo 적용됨

#### 적용 필요 파일

| 파일 | 현재 상태 | 조치 |
|------|----------|------|
| `components/charts/RealtimeTrafficChart.tsx` | 메모이제이션 없음 | React.memo 래핑 + 기본값 설정 |
| `components/charts/TenantPieChart.tsx` | 메모이제이션 없음 | React.memo 래핑 + 기본값 설정 |
| `components/charts/CostTrendChart.tsx` | 메모이제이션 없음 | React.memo 래핑 + 기본값 설정 |
| `components/charts/UsageHeatmap.tsx` | 메모이제이션 없음 | React.memo 래핑 + 기본값 설정 (Recharts 미사용, 데이터 변환 비용 절감 목적) |
| `components/charts/ErrorGauge.tsx` | 메모이제이션 없음 | React.memo 래핑 + 기본값 설정 |
| `components/charts/TokenScatterPlot.tsx` | 메모이제이션 없음 | React.memo 래핑 + 기본값 설정 |
| `components/charts/UserRequestsBarChart.tsx` | 메모이제이션 없음 | React.memo 래핑 + 기본값 설정 |

---

### 3. next/dynamic으로 Recharts 지연 로딩

#### 문제
Recharts 라이브러리 (~200KB gzip)가 초기 번들에 포함됩니다. 페이지 초기 로드 시간이 길어지고, 차트가 뷰포트에 보이기 전에도 JavaScript가 파싱됩니다.

#### 언제 적용하나?
- Recharts를 직접 import하는 페이지 컴포넌트
- 스크롤해야 보이는 하단 섹션의 무거운 컴포넌트
- 여러 차트를 한 페이지에 렌더하는 경우

**중요**: Recharts는 브라우저 API(window, document)를 사용하므로 `ssr: false` 필수입니다.

#### Before
```tsx
import TokenEfficiencyTrendChart from '@/components/charts/TokenEfficiencyTrendChart';
import FAQAnalysisSection from '@/components/faq-analysis/FAQAnalysisSection';
import CostTrendChart from '@/components/charts/CostTrendChart';

export default function QualityPage() {
  return (
    <Dashboard>
      <TokenEfficiencyTrendChart data={data} />
      <CostTrendChart data={costData} />
      <FAQAnalysisSection />
    </Dashboard>
  );
}
```

#### After
```tsx
import dynamic from 'next/dynamic';

const TokenEfficiencyTrendChart = dynamic(
  () => import('@/components/charts/TokenEfficiencyTrendChart'),
  {
    ssr: false,
    loading: () => <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />
  }
);

const CostTrendChart = dynamic(
  () => import('@/components/charts/CostTrendChart'),
  {
    ssr: false,
    loading: () => <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />
  }
);

const FAQAnalysisSection = dynamic(
  () => import('@/components/faq-analysis/FAQAnalysisSection'),
  {
    loading: () => <div className="h-48 bg-slate-800/50 rounded-lg animate-pulse" />
  }
);

export default function QualityPage() {
  return (
    <Dashboard>
      <TokenEfficiencyTrendChart data={data} />
      <CostTrendChart data={costData} />
      <FAQAnalysisSection />
    </Dashboard>
  );
}
```

#### 참고 구현체
- `app/dashboard/quality/page.tsx:4, 12-25` — 3개 동적 import 적용된 완전한 예시

#### 적용 필요 파일

| 페이지 | Recharts 차트 | 조치 |
|--------|--------------|------|
| `app/dashboard/business/page.tsx` | TenantPieChart, CostTrendChart | dynamic() 래핑 (UsageHeatmap은 Recharts 미사용이므로 제외) |
| `app/dashboard/operations/page.tsx` | RealtimeTrafficChart, ErrorGauge 등 | dynamic() 래핑 |
| `app/dashboard/user-analytics/page.tsx` | TokenScatterPlot, UserRequestsBarChart | dynamic() 래핑 |

---

### 4. DataTable.Pagination으로 DOM 노드 감소

#### 문제
수백 행을 한번에 DOM에 렌더하면 레이아웃 계산, 이벤트 리스너 바인딩 비용이 증가합니다. 스크롤 성능이 저하되고 메모리 사용량이 늘어납니다.

#### 언제 적용하나?
- DataTable에 50개 이상의 행이 올 수 있는 경우
- 특히 복잡한 render 함수가 있는 컬럼이 있는 경우
- 페이지에 여러 테이블이 있는 경우

#### Before (안티패턴)
```tsx
// 안티패턴 1: 페이지네이션 없음 - 모든 행이 DOM에 존재
<DataTable data={largeData} columns={columns}>
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body />
  </DataTable.Content>
  <DataTable.Footer />
</DataTable>

// 안티패턴 2: 클라이언트 slice로 자르기 - 매번 새 배열 생성
<DataTable data={data.slice(0, 20)} columns={columns}>
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body />
  </DataTable.Content>
  <DataTable.Footer />
</DataTable>
```

#### After
```tsx
<DataTable data={largeData} columns={columns}>
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body />
  </DataTable.Content>
  <DataTable.Pagination pageSize={20} />
  <DataTable.Footer />
</DataTable>
```

DataTable.Pagination 컴포넌트가 자동으로:
- 페이지네이션 UI 제공
- 현재 페이지 데이터만 렌더
- 페이지 변경 시 부드러운 업데이트

#### 참고 구현체
- `app/dashboard/chatbot-quality/page.tsx:407, 430, 453, 476` — 4개 테이블 모두 Pagination 적용됨

#### 적용 필요 파일

| 파일 | 테이블 | 현재 행 수 | 조치 |
|------|--------|----------|------|
| `app/dashboard/quality/page.tsx:165` | RepeatedQueries | ~50 | .slice(0, 20) 제거, DataTable.Pagination 추가 |

---

### 5. Progressive Loading (워터폴 해소)

#### 문제
여러 API를 동시에 호출하되, 페이지 전체가 가장 느린 API를 기다립니다. 사용자는 먼저 로드된 섹션을 볼 수 없고, 전체 스켈레톤 로딩 상태에 머물러 있습니다.

#### 언제 적용하나?
- 2개 이상의 독립적인 useQuery가 있는 페이지
- `isLoading = queryA.isLoading || queryB.isLoading || ...` 패턴이 있는 경우
- 섹션별로 데이터가 독립적인 경우

#### Before (전체 워터폴)
```tsx
export default function QualityPage() {
  const efficiencyQuery = useQuery({
    queryKey: ['efficiency'],
    queryFn: fetchEfficiency
  });

  const correlationQuery = useQuery({
    queryKey: ['correlation'],
    queryFn: fetchCorrelation // 느린 API
  });

  const patternsQuery = useQuery({
    queryKey: ['patterns'],
    queryFn: fetchPatterns
  });

  // 모든 쿼리가 로드될 때까지 전체 페이지가 스켈레톤
  const isLoading = efficiencyQuery.isLoading || correlationQuery.isLoading || patternsQuery.isLoading;

  return (
    <Dashboard isLoading={isLoading}>
      <Dashboard.Skeleton /> {/* ← 모든 API 대기 */}
      <Dashboard.Content>
        <ChartA data={efficiencyQuery.data} /> {/* 빠름 */}
        <ChartB data={correlationQuery.data} /> {/* 느림 */}
        <TableC data={patternsQuery.data} /> {/* 빠름 */}
      </Dashboard.Content>
    </Dashboard>
  );
}
```

#### After (섹션별 독립 로딩)
```tsx
export default function QualityPage() {
  const efficiencyQuery = useQuery({
    queryKey: ['efficiency'],
    queryFn: fetchEfficiency
  });

  const correlationQuery = useQuery({
    queryKey: ['correlation'],
    queryFn: fetchCorrelation
  });

  const patternsQuery = useQuery({
    queryKey: ['patterns'],
    queryFn: fetchPatterns
  });

  // KPI 최소 필요: efficiency만 필수, 나머지는 선택
  const isLoading = efficiencyQuery.isLoading && !efficiencyQuery.data;

  return (
    <Dashboard isLoading={isLoading}>
      <Dashboard.Skeleton layout="kpi" /> {/* ← efficiency만 기다림 */}
      <Dashboard.Content>

        {/* ChartA: 독립 로딩 상태 */}
        {efficiencyQuery.isLoading ? (
          <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />
        ) : (
          <ChartA data={efficiencyQuery.data} />
        )}

        {/* ChartB: 독립 로딩 상태 */}
        {correlationQuery.isLoading ? (
          <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />
        ) : (
          <ChartB data={correlationQuery.data} />
        )}

        {/* 테이블 섹션 */}
        <Dashboard.TableSection title="반복 질문">
          {patternsQuery.isLoading ? (
            <div className="h-48 bg-slate-800/50 rounded-lg animate-pulse" />
          ) : (
            <DataTable data={patternsQuery.data} columns={columns} />
          )}
        </Dashboard.TableSection>
      </Dashboard.Content>
    </Dashboard>
  );
}
```

**포인트**:
- `isLoading`은 필수 데이터(KPI)만 기준으로 설정
- 각 섹션이 독립적인 로딩/에러 상태 가짐
- 사용자는 먼저 로드된 섹션부터 볼 수 있음

#### 참고 구현체
- `app/dashboard/chatbot-quality/page.tsx:314-316, 392-480` — 4개 테이블 독립 로딩 상태
- `app/dashboard/quality/page.tsx:32-36, 143-207` — 차트/테이블 독립 로딩, 개별 skeleton
- `hooks/queries/use-quality.ts:200-211` — 개별 로딩 상태 노출 (isEfficiencyLoading, isCorrelationLoading, isPatternsLoading)

#### 적용 필요 파일

| 페이지 | 현재 상태 | 조치 |
|--------|----------|------|
| `app/dashboard/business/page.tsx` | 전체 워터폴 | KPI 섹션 분리, 각 차트별 독립 로딩 상태 |
| `app/dashboard/operations/page.tsx` | 전체 워터폴 | KPI 섹션 분리, 각 차트별 독립 로딩 상태 |

---

### 6. 백엔드: 응답 크기 최적화 (Lazy Detail Fetch)

#### 문제
목록 API가 상세 텍스트까지 포함하여 응답 크기가 수 MB에 달합니다. 실제로 텍스트가 필요한 것은 사용자가 특정 항목을 클릭할 때뿐입니다.

#### 언제 적용하나?
- 목록 API 응답에 긴 텍스트 필드(user_input, llm_response, content 등)가 포함된 경우
- 100개 이상의 행을 반환하면서 각 행에 1KB 이상의 텍스트가 있는 경우
- 차트/테이블 렌더링에는 숫자 데이터만 필요한 경우

#### Before (문제가 있는 쿼리)
```sql
SELECT
  tenant_id,
  query_length,
  response_length,
  SUBSTR(user_input, 1, 2000) as user_input,      -- 불필요 (목록에서 미사용)
  SUBSTR(llm_response, 1, 2000) as llm_response    -- 불필요 (목록에서 미사용)
FROM logs
WHERE DATE(timestamp AT TIME ZONE 'Asia/Seoul') >= (NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '7 days'
LIMIT 1000;

-- 응답 크기: ~4MB (텍스트 때문)
-- 프론트에 도착하는데 2-3초 소요
```

#### After (목록 쿼리 - 숫자만)
```sql
SELECT
  tenant_id,
  query_length,
  response_length,
  efficiency_ratio,
  timestamp,
  success
FROM logs
WHERE DATE(timestamp AT TIME ZONE 'Asia/Seoul') >= (NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '7 days'
LIMIT 300;

-- 응답 크기: ~30KB (텍스트 없음)
-- 프론트에 도착하는데 100-200ms
```

#### After (상세 쿼리 - 텍스트만, 별도 엔드포인트)
```typescript
// Backend: MetricsService
async getQueryDetail(projectId: string, timestamp: string, tenantId: string) {
  return this.bigQueryDataSource.query(`
    SELECT
      SUBSTR(user_input, 1, 2000) as user_input,
      SUBSTR(llm_response, 1, 2000) as llm_response
    FROM \`${this.datasetId}.${this.tableName}\`
    WHERE timestamp = @timestamp
      AND tenant_id = @tenantId
    LIMIT 1
  `, {
    timestamp: new Date(timestamp),
    tenantId: tenantId,
  });
}
```

#### 프론트엔드 연동

```typescript
// services/qualityService.ts
export async function fetchCorrelationDetail(
  projectId: string,
  timestamp: string,
  tenantId: string
) {
  const response = await fetch(`/api/v1/projects/${projectId}/api/quality/correlation/detail`, {
    method: 'POST',
    body: JSON.stringify({ timestamp, tenantId }),
  });
  return response.json();
}

// components/QueryResponseScatterPlot.tsx
const handleScatterClick = useCallback(async (data: any) => {
  setSelectedDetail(data);
  setDetailLoading(true);

  try {
    const detail = await fetchCorrelationDetail(projectId, data.timestamp, data.tenant_id);
    setDetailText({
      userInput: detail.user_input,
      llmResponse: detail.llm_response,
    });
  } finally {
    setDetailLoading(false);
  }
}, [projectId]);
```

#### 참고 구현체
- 백엔드: `apps/backend/src/metrics/queries/metrics.queries.ts:249-295` — queryResponseCorrelation(line 249), queryResponseDetail(line 279)
- 프론트: `apps/frontend-next/src/components/charts/QueryResponseScatterPlot.tsx:70-83` — handleScatterClick (lazy detail fetch)
- 훅: `apps/frontend-next/src/hooks/queries/use-quality.ts:219-229` — fetchCorrelationDetail 함수

#### 적용 우선순위

| API | 응답 크기 | 텍스트 필드 | 행 수 | 우선순위 |
|-----|----------|-----------|-------|---------|
| 이상 탐지 목록 | 2MB | llm_response | 200 | 높음 |
| FAQ 분석 | 1.5MB | content | 100 | 높음 |
| 세션 분석 | 3MB | messages | 500 | 중간 |
| 품질 분석 | 1MB | query_pattern | 300 | 중간 |

---

## 적용 우선순위 (Impact × 난이도 기준)

| 우선순위 | 패턴 | 적용 대상 | 작업 시간 | 예상 성능 향상 |
|---------|------|----------|----------|---------------|
| **1순위** | React.memo | 차트 컴포넌트 7개 | 5분/개 (35분) | 30-40% 리렌더 감소 |
| **2순위** | useMemo | 차트 + 페이지 10곳 | 10분/개 (100분) | 20-30% 렌더 시간 감소 |
| **3순위** | next/dynamic | business, operations 페이지 | 10분/개 (20분) | 초기 번들 20% 감소 |
| **4순위** | DataTable.Pagination | quality/page.tsx | 5분 | DOM 노드 80% 감소 |
| **5순위** | Progressive Loading | 4개 페이지 | 30분/개 (120분) | 체감 로딩 속도 2-3배 개선 |
| **6순위** | Lazy Detail Fetch | 3개 API | 1시간/개 (3시간) | 초기 응답 크기 90% 감소 |

**추천 적용 순서**:
1. React.memo (가장 빠른 성능 향상)
2. useMemo (지표상 효과 가장 높음)
3. next/dynamic (번들 크기 최적화)
4. Progressive Loading (사용자 체감 개선)
5. DataTable.Pagination (특정 페이지만 필요)
6. Lazy Detail Fetch (백엔드 작업 필요)

---

## 성능 측정 방법

### Core Web Vitals 측정

```bash
# Next.js 분석 보고서 (로컬)
ANALYZE=true pnpm build:frontend-next

# 번들 크기 확인
pnpm build:frontend-next --profile
# → .next/static 디렉토리에서 파일 크기 비교
```

### 크롬 DevTools

1. **성능 프로필링**
   - F12 → Performance 탭 → Record
   - 페이지 새로고침 → 1초 대기 → Stop
   - "Rendering" 섹션에서 리렌더 횟수 확인

2. **렌더 시간 추적**
   - F12 → Performance → "Measure user journey" 활용
   - 각 섹션별 FCP(First Contentful Paint), LCP(Largest Contentful Paint) 확인

### React DevTools

```bash
# React 18 Profiler 설치
# 브라우저: React DevTools 익스텐션
# → Profiler 탭 → "Start profiling"
# → 페이지 상호작용 → "Flamegraph" 확인
```

### Baseline 측정 → 적용 → 재측정 사이클

성능 최적화의 효과를 검증하려면 **반드시** 적용 전후 수치를 비교해야 합니다.

#### 측정 프로세스

1. **Baseline 기록** (각 Phase 시작 전)
   - Chrome DevTools → Performance 탭에서 각 페이지 LCP/FCP 3회 측정 → 평균값 기록
   - React DevTools Profiler에서 리렌더 횟수/시간 기록
   - `pnpm build:frontend-next` 후 `.next/static` 청크 사이즈 기록

2. **최적화 적용**

3. **재측정** (각 Phase 완료 후)
   - 동일 조건에서 LCP/FCP 3회 측정
   - 리렌더 횟수/시간 비교
   - 번들 사이즈 비교

4. **기록 양식**

| 페이지 | 지표 | Before | After | 개선율 |
|--------|------|--------|-------|--------|
| business | LCP | _ms | _ms | _% |
| business | FCP | _ms | _ms | _% |
| operations | LCP | _ms | _ms | _% |
| quality | 리렌더 횟수 | _회 | _회 | _% |

---

## 체크리스트

### Phase 1: React.memo (1-2일)

- [ ] TokenEfficiencyTrendChart.tsx — 이미 적용됨 ✓
- [ ] QueryResponseScatterPlot.tsx — 이미 적용됨 ✓
- [ ] RealtimeTrafficChart.tsx — React.memo 래핑
- [ ] TenantPieChart.tsx — React.memo 래핑
- [ ] CostTrendChart.tsx — React.memo 래핑
- [ ] UsageHeatmap.tsx — React.memo 래핑
- [ ] ErrorGauge.tsx — React.memo 래핑
- [ ] TokenScatterPlot.tsx — React.memo 래핑
- [ ] UserRequestsBarChart.tsx — React.memo 래핑

### Phase 2: useMemo (2-3일)

- [ ] RealtimeTrafficChart.tsx — sortedData 메모이제이션
- [ ] TenantPieChart.tsx — 데이터 변환 메모이제이션
- [ ] CostTrendChart.tsx — 계산 메모이제이션
- [ ] UsageHeatmap.tsx — 히트맵 데이터 메모이제이션
- [ ] user-analytics/page.tsx — 4개 KPI 메모이제이션
- [ ] quality/page.tsx — totalOccurrences 메모이제이션
- [ ] issue-frequency/page.tsx — chartData 메모이제이션

### Phase 3: next/dynamic (1일)

- [ ] business/page.tsx — 차트 2개 동적 로드 (TenantPieChart, CostTrendChart — UsageHeatmap은 Recharts 미사용으로 제외)
- [ ] operations/page.tsx — 차트 2개 동적 로드 (RealtimeTrafficChart, ErrorGauge)

### Phase 4: Progressive Loading (3-4일)

- [ ] business/page.tsx — 섹션별 독립 로딩
- [ ] operations/page.tsx — 섹션별 독립 로딩
- [ ] user-analytics/page.tsx — 섹션별 독립 로딩
- [ ] quality/page.tsx — 테이블별 독립 로딩 (부분 적용됨)

### Phase 5: DataTable.Pagination (1일)

- [ ] quality/page.tsx — RepeatedQueries 테이블 Pagination 추가

### Phase 6: 백엔드 최적화 (5-7일)

- [ ] 이상 탐지 목록 API — 텍스트 제거, 상세 엔드포인트 추가
- [ ] FAQ 분석 API — 텍스트 제거, 상세 엔드포인트 추가
- [ ] 세션 분석 API — 메시지 제거, 상세 엔드포인트 추가

---

## FAQ

### Q: React.memo를 적용하면 모든 컴포넌트에 적용해야 하나?

**A**: 아닙니다. 다음 경우에만 적용하세요:
- 렌더링 비용이 높은 컴포넌트 (Recharts 차트, 복잡한 테이블 등)
- props가 자주 바뀌지 않는 컴포넌트
- 부모에서 자주 리렌더되는 컴포넌트

간단한 UI 컴포넌트(Button, Badge 등)는 오버헤드가 더 크므로 적용하지 마세요.

### Q: useMemo를 모든 배열 연산에 적용해야 하나?

**A**: 아닙니다. 데이터 크기와 비용을 고려하세요:
- **적용**: 100개 이상의 행, O(n) 이상 복잡도, 페이지 로드 시 계산
- **미적용**: 10개 이하의 행, O(1) 연산, 매우 가벼운 변환

### Q: next/dynamic의 loading skeleton이 필수인가?

**A**: 필수입니다. 로딩 상태를 보여주지 않으면 사용자가 혼란스러워합니다.

```tsx
// 권장: 실제 컴포넌트와 같은 높이의 skeleton
const MyChart = dynamic(
  () => import('@/components/charts/MyChart'),
  {
    ssr: false,
    loading: () => <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />
  }
);

// 최소: 제너릭 skeleton
const MyChart = dynamic(
  () => import('@/components/charts/MyChart'),
  { ssr: false }
);
```

### Q: Progressive Loading에서 몇 개 이상의 API부터 적용해야 하나?

**A**: 2개 이상의 독립적인 API가 있으면 적용하세요. 예외:
- 모든 API가 같은 시간에 로드되는 경우 (워터폴 없음) → 굳이 분리 불필요
- 한 API가 다른 API의 결과에 의존하는 경우 → 순차 처리 필요

### Q: 응답 크기 최적화는 얼마나 효과가 있나?

**A**: 매우 큽니다. 실제 사례:
- 목록 API: 4MB → 30KB (99% 감소)
- 초기 로딩: 2-3초 → 100-200ms (15배 개선)
- 네트워크 병목: 5G/WiFi에서 눈에 띄지만, 3G/4G에서는 극적임

---

## 참고 자료

### 공식 문서
- [React.memo](https://react.dev/reference/react/memo)
- [useMemo](https://react.dev/reference/react/useMemo)
- [Next.js Dynamic Import](https://nextjs.org/docs/app/building-your-application/optimizing/dynamic-imports)
- [Web Vitals](https://web.dev/articles/vitals)

### 성능 최적화 도구
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [Web Vitals Library](https://github.com/GoogleChrome/web-vitals)

---

## 문서 이력

| 버전 | 작성일 | 변경 사항 |
|------|--------|---------|
| 1.0 | 2026-02-06 | 초판 작성 (6개 패턴, 체크리스트) |
| 1.1 | 2026-02-06 | 리뷰 반영: 라인 번호 수정, 인라인 props 경고 추가, UsageHeatmap 분류 수정, baseline 측정 프로세스 추가, admin/users 제거 |

**마지막 업데이트**: 2026-02-06
