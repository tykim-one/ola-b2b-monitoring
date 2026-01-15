# Frontend 구현 내역

## 개요
Next.js 16 기반 프론트엔드에 3개의 대시보드 뷰와 차트 컴포넌트를 구현했습니다.

---

## 1. 프로젝트 구조

```
apps/frontend-next/src/
├── app/
│   └── dashboard/
│       ├── page.tsx              # 대시보드 메인
│       ├── operations/
│       │   └── page.tsx          # 운영 모니터링 뷰
│       ├── business/
│       │   └── page.tsx          # 비즈니스 분석 뷰
│       └── ai-performance/
│           └── page.tsx          # AI 성능 분석 뷰
├── components/
│   ├── kpi/
│   │   └── KPICard.tsx           # KPI 카드 컴포넌트
│   ├── charts/
│   │   ├── RealtimeTrafficChart.tsx   # 실시간 트래픽 차트
│   │   ├── ErrorGauge.tsx             # 에러율 게이지
│   │   ├── TenantPieChart.tsx         # 테넌트별 파이 차트
│   │   ├── CostTrendChart.tsx         # 비용 트렌드 차트
│   │   ├── UsageHeatmap.tsx           # 사용량 히트맵
│   │   └── TokenScatterPlot.tsx       # 토큰 효율성 산점도
│   └── Sidebar.tsx               # 사이드바 네비게이션
└── types.ts                      # 타입 정의
```

---

## 2. 대시보드 뷰

### 2.1 운영 모니터링 (`/dashboard/operations`)

실시간 시스템 상태를 모니터링하는 뷰입니다.

**포함 컴포넌트:**
| 컴포넌트 | 설명 |
|----------|------|
| KPICard (4개) | 총 요청, 성공률, 에러율, 활성 테넌트 |
| RealtimeTrafficChart | 24시간 트래픽 추이 (AreaChart) |
| ErrorGauge | 에러율 시각화 (RadialBarChart) |

**데이터 소스:**
```typescript
GET /projects/{projectId}/metrics/realtime
GET /projects/{projectId}/metrics/hourly
```

### 2.2 비즈니스 분석 (`/dashboard/business`)

테넌트별 사용량과 비용을 분석하는 뷰입니다.

**포함 컴포넌트:**
| 컴포넌트 | 설명 |
|----------|------|
| TenantPieChart | 테넌트별 토큰/요청 비율 (PieChart) |
| CostTrendChart | 일별 비용 추이 (ComposedChart) |
| UsageHeatmap | 요일/시간대별 사용량 패턴 (Heatmap) |

**데이터 소스:**
```typescript
GET /projects/{projectId}/analytics/tenant-usage
GET /projects/{projectId}/analytics/cost-trend
GET /projects/{projectId}/analytics/heatmap
```

### 2.3 AI 성능 분석 (`/dashboard/ai-performance`)

토큰 효율성과 이상 탐지 결과를 분석하는 뷰입니다.

**포함 컴포넌트:**
| 컴포넌트 | 설명 |
|----------|------|
| TokenScatterPlot | Input/Output 토큰 효율성 (ScatterChart) |
| AnomalyList | 이상 탐지 알림 목록 |

**데이터 소스:**
```typescript
GET /projects/{projectId}/ai/token-efficiency
GET /ml/anomalies/{projectId}
```

---

## 3. 차트 컴포넌트

### 3.1 KPICard

KPI 지표를 카드 형태로 표시합니다.

```typescript
interface KPICardProps {
  title: string;           // 카드 제목
  value: string | number;  // 주요 값
  subtitle?: string;       // 부제목
  trend?: number;          // 변화율 (%)
  icon?: React.ReactNode;  // 아이콘
  color?: 'blue' | 'green' | 'red' | 'yellow';
}
```

**사용 예시:**
```tsx
<KPICard
  title="총 요청"
  value="12,345"
  subtitle="지난 24시간"
  trend={5.2}
  color="blue"
/>
```

### 3.2 RealtimeTrafficChart

시간대별 트래픽을 AreaChart로 표시합니다.

```typescript
interface TrafficData {
  hour: string;
  request_count: number;
  success_count: number;
  fail_count: number;
}

interface RealtimeTrafficChartProps {
  data: TrafficData[];
  title?: string;
}
```

**특징:**
- 요청 수: 파란색 영역
- 실패 수: 빨간색 영역
- 그라데이션 효과 적용
- 시간 포맷 자동 변환 (HH:MM)

### 3.3 ErrorGauge

에러율을 RadialBarChart로 시각화합니다.

```typescript
interface ErrorGaugeProps {
  errorRate: number;  // 0-100 (%)
  title?: string;
}
```

**특징:**
- 에러율에 따른 색상 변화 (녹색 → 노랑 → 빨강)
- 중앙에 퍼센트 표시
- 180도 반원 형태

### 3.4 TenantPieChart

테넌트별 사용량을 PieChart로 표시합니다.

```typescript
interface TenantData {
  tenant_id: string;
  total_tokens: number;
  request_count: number;
}

interface TenantPieChartProps {
  data: TenantData[];
  title?: string;
  dataKey?: 'total_tokens' | 'request_count';
}
```

**특징:**
- 도넛 차트 형태 (innerRadius 적용)
- 우측 범례 표시
- 총합 표시

### 3.5 CostTrendChart

일별 비용 추이를 ComposedChart로 표시합니다.

```typescript
interface CostData {
  date: string;
  input_cost: number;
  output_cost: number;
  total_cost: number;
  total_tokens: number;
}

interface CostTrendChartProps {
  data: CostData[];
  title?: string;
}
```

**특징:**
- 막대: Input/Output 비용 (스택)
- 선: 총 비용 추이
- 듀얼 Y축 (비용, 토큰)

### 3.6 UsageHeatmap

요일/시간대별 사용량을 히트맵으로 표시합니다.

```typescript
interface HeatmapCell {
  day_of_week: number;  // 1-7 (일-토)
  hour: number;         // 0-23
  request_count: number;
}

interface UsageHeatmapProps {
  data: HeatmapCell[];
  title?: string;
}
```

**특징:**
- 7x24 그리드 레이아웃
- 사용량에 따른 색상 강도
- 요일/시간 라벨

### 3.7 TokenScatterPlot

토큰 효율성을 ScatterChart로 분석합니다.

```typescript
interface TokenData {
  tenant_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  efficiency_ratio: number;
}

interface TokenScatterPlotProps {
  data: TokenData[];
  title?: string;
}
```

**특징:**
- X축: Input 토큰
- Y축: Output 토큰
- 버블 크기: 총 토큰
- 테넌트별 색상 구분

---

## 4. 스타일링

### 4.1 색상 팔레트

```css
/* 배경 */
--bg-primary: #0f172a;    /* slate-900 */
--bg-card: #1e293b;       /* slate-800 */
--bg-border: #334155;     /* slate-700 */

/* 텍스트 */
--text-primary: #f1f5f9;  /* slate-100 */
--text-secondary: #94a3b8; /* slate-400 */

/* 차트 색상 */
--chart-blue: #3b82f6;
--chart-green: #10b981;
--chart-yellow: #f59e0b;
--chart-red: #f43f5e;
--chart-purple: #8b5cf6;
--chart-cyan: #06b6d4;
```

### 4.2 공통 카드 스타일

```tsx
<div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
  <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
  {/* 차트 내용 */}
</div>
```

---

## 5. 데이터 페칭

### 5.1 API 호출 패턴

```typescript
// 서버 컴포넌트에서 데이터 페칭
async function fetchMetrics(projectId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/metrics/realtime`,
    { next: { revalidate: 300 } }  // 5분 캐시
  );
  return res.json();
}

// 페이지 컴포넌트
export default async function OperationsPage() {
  const metrics = await fetchMetrics('ibks');
  return <Dashboard data={metrics} />;
}
```

### 5.2 클라이언트 사이드 갱신

```typescript
'use client';

import useSWR from 'swr';

function Dashboard() {
  const { data, error, isLoading } = useSWR(
    '/api/metrics/realtime',
    fetcher,
    { refreshInterval: 60000 }  // 1분마다 갱신
  );

  if (isLoading) return <Loading />;
  if (error) return <Error />;

  return <Charts data={data} />;
}
```

---

## 6. 실행 방법

```bash
# 개발 모드
pnpm dev:frontend

# 빌드
pnpm build:frontend

# 프로덕션 실행
pnpm start:frontend
```

**접속 URL:**
- 개발: http://localhost:3001
- 운영 모니터링: http://localhost:3001/dashboard/operations
- 비즈니스 분석: http://localhost:3001/dashboard/business
- AI 성능: http://localhost:3001/dashboard/ai-performance

---

## 7. 확장 방법

### 7.1 새 차트 컴포넌트 추가

1. 컴포넌트 파일 생성
```typescript
// apps/frontend-next/src/components/charts/NewChart.tsx
'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface NewChartProps {
  data: DataType[];
  title?: string;
}

const NewChart: React.FC<NewChartProps> = ({ data, title }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            {/* 차트 설정 */}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NewChart;
```

2. 대시보드 페이지에서 사용
```tsx
import NewChart from '@/components/charts/NewChart';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <NewChart data={chartData} title="새 차트" />
    </div>
  );
}
```

### 7.2 새 대시보드 뷰 추가

1. 페이지 파일 생성
```typescript
// apps/frontend-next/src/app/dashboard/new-view/page.tsx
export default function NewViewPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">새 뷰</h1>
      {/* 차트 컴포넌트들 */}
    </div>
  );
}
```

2. 사이드바에 링크 추가
```typescript
// apps/frontend-next/src/components/Sidebar.tsx
const menuItems = [
  // 기존 메뉴...
  { href: '/dashboard/new-view', label: '새 뷰', icon: NewIcon },
];
```

### 7.3 실시간 업데이트 추가

WebSocket 연결로 실시간 데이터 수신:

```typescript
'use client';

import { useEffect, useState } from 'react';

function RealtimeDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ws/metrics');

    ws.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };

    return () => ws.close();
  }, []);

  return <Charts data={data} />;
}
```

### 7.4 다크/라이트 모드 지원

```typescript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ...
};

// 컴포넌트에서 사용
<div className="bg-white dark:bg-slate-800">
  <h3 className="text-gray-900 dark:text-white">제목</h3>
</div>
```

### 7.5 반응형 그리드 레이아웃

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <KPICard />
  <KPICard />
  <KPICard />
</div>
```

---

## 8. 의존성

```json
{
  "dependencies": {
    "next": "^16.x",
    "react": "^19.x",
    "recharts": "^2.x",
    "tailwindcss": "^4.x",
    "swr": "^2.x"
  }
}
```
