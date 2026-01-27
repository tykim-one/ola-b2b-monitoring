# Report Monitoring Frontend 구현 계획

> **다음 세션에서 구현 시 이 파일을 참고하세요**
>
> 사용법: `이 계획을 따라 Report Monitoring 프론트엔드를 구현해줘: docs/frontend/PLAN_REPORT_MONITORING_FRONTEND.md`

## 개요
백엔드에 구현된 Report Monitoring API를 위한 프론트엔드 대시보드 구현

## 구현 파일 목록

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `apps/frontend-next/src/services/reportMonitoringService.ts` | 신규 생성 |
| 2 | `apps/frontend-next/src/app/dashboard/report-monitoring/page.tsx` | 신규 생성 |
| 3 | `apps/frontend-next/src/components/Sidebar.tsx` | 네비게이션 추가 |

---

## 🔴 리뷰 반영 사항 (반드시 준수)

### Critical Issues 해결
1. **`/status` 응답 타입 분기**: 타입 가드 함수로 `MonitoringResult` vs `{ message }` 구분
2. **Date 직렬화**: 모든 Date 타입을 `string`으로 정의 (JSON 직렬화)
3. **POST 타임아웃 처리**: `checking` 상태 분리 + 버튼 disabled 처리
4. **중복 기능 제거**: "스케줄러 트리거" 버튼 제거, "즉시 체크 실행"만 노출

### Medium Issues 해결
5. **대량 데이터 처리**: 누락/오래된 심볼 최대 10개 표시 + 접기/펼치기
6. **자동 새로고침 충돌 방지**: 체크 실행 중 자동 새로고침 스킵
7. **"체크 미실행" 상태 UI**: EmptyState로 첫 체크 유도

---

## 1. Service Client (`reportMonitoringService.ts`)

**패턴**: `windEtlService.ts` 참고 (네이티브 fetch + API_BASE)

```typescript
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/report-monitoring`;

// Types (Date → string으로 직렬화)
export type ReportType = 'ai_stock' | 'commodity' | 'forex' | 'dividend';

export interface StaleDetail {
  symbol: string;
  updatedAt: string;  // ISO date string
  daysBehind: number;
}

export interface ReportCheckResult {
  reportType: ReportType;
  totalTargets: number;
  existingCount: number;
  missingSymbols: string[];
  freshCount: number;
  staleSymbols: string[];
  staleDetails: StaleDetail[];
  hasCriticalIssues: boolean;
  checkedAt: string;
}

export interface MonitoringSummary {
  totalReports: number;
  healthyReports: number;
  issueReports: number;
  totalMissing: number;
  totalStale: number;
}

export interface MonitoringResult {
  results: ReportCheckResult[];
  summary: MonitoringSummary;
  timestamp: string;
}

export interface NoCheckMessage {
  message: string;  // "No check has been executed yet"
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  db: { connected: boolean; type: string | null };
  scheduler: {
    isRunning: boolean;
    cronExpression: string;
    timezone: string;
    nextExecution: string | null;
  };
  targetFiles: Array<{ reportType: ReportType; filename: string }>;
}

// 🔴 타입 가드 함수 (Critical Issue #1)
export function isMonitoringResult(data: MonitoringResult | NoCheckMessage): data is MonitoringResult {
  return 'results' in data && 'summary' in data;
}

// API Methods (실제 구현 필요)
export const reportMonitoringApi = {
  async getStatus(): Promise<MonitoringResult | NoCheckMessage> {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) throw new Error('Failed to fetch status');
    return response.json();
  },

  async runFullCheck(): Promise<MonitoringResult> {
    const response = await fetch(`${API_BASE}/check`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to run check');
    return response.json();
  },

  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Failed to fetch health');
    return response.json();
  },
};
```

---

## 2. Dashboard Page (`page.tsx`)

**패턴**: `etl/wind/page.tsx` 참고

### 페이지 구조

```
┌─────────────────────────────────────────────────────────────┐
│ Header: "리포트 데이터 모니터링" + 마지막 갱신 시간          │
├─────────────────────────────────────────────────────────────┤
│ Action: [즉시 체크 실행] (체크 중이면 disabled + 스피너)    │
├─────────────────────────────────────────────────────────────┤
│ 조건부 렌더링:                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ A. 체크 미실행 시:                                      ││
│ │    "아직 체크가 실행되지 않았습니다" + [첫 체크 실행]   ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ B. 체크 결과 있을 시:                                   ││
│ │                                                         ││
│ │ KPI Cards (4개)                                         ││
│ │ ┌──────────┬──────────┬──────────┬──────────┐          ││
│ │ │ 전체 4개 │ 정상 N개 │ 누락 N건 │ 오래됨 N │          ││
│ │ └──────────┴──────────┴──────────┴──────────┘          ││
│ │                                                         ││
│ │ 리포트별 상태 테이블 (hasCriticalIssues 행 강조)       ││
│ │                                                         ││
│ │ 이슈 상세 (접기/펼치기, 최대 10개 + "외 N건")          ││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ 시스템 상태 Footer                                          │
│ - DB 연결 상태 (미연결 시 체크 버튼 비활성화)              │
│ - 스케줄러 상태 (cron, timezone, 다음 실행)                │
│ - 타겟 파일 목록                                            │
└─────────────────────────────────────────────────────────────┘
```

### 상태 관리

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  reportMonitoringApi,
  isMonitoringResult,
  MonitoringResult,
  HealthResponse,
  ReportType,
} from '@/services/reportMonitoringService';

export default function ReportMonitoringPage() {
  const [monitoringResult, setMonitoringResult] = useState<MonitoringResult | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);  // 체크 실행 중 (버튼 disabled)
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // 이슈 상세 접기/펼치기
  const [expandedReports, setExpandedReports] = useState<Set<ReportType>>(new Set());

  const isFetchingRef = useRef<boolean>(false);
  const initialLoadDone = useRef<boolean>(false);

  // ... 나머지 구현
}
```

### 주요 기능

1. **초기 로드**: `getHealth()` 먼저 → DB 연결 확인 후 `getStatus()` 호출
2. **타입 분기 처리**: `isMonitoringResult()` 타입 가드로 응답 구분
3. **5분 자동 새로고침**: `checking` 상태일 때는 스킵
4. **즉시 체크**: 버튼 클릭 시 `checking=true` → 완료 후 결과 업데이트
5. **DB 미연결 시**: 체크 버튼 비활성화 + 경고 메시지

### 데이터 fetching 로직

```typescript
const fetchData = useCallback(async () => {
  if (isFetchingRef.current || checking) return;  // 체크 중이면 스킵
  isFetchingRef.current = true;

  try {
    setLoading(true);
    const healthData = await reportMonitoringApi.getHealth();
    setHealth(healthData);

    if (healthData.db.connected) {
      const statusData = await reportMonitoringApi.getStatus();
      if (isMonitoringResult(statusData)) {
        setMonitoringResult(statusData);
      } else {
        setMonitoringResult(null);  // "No check" 상태
      }
    }
    setError(null);
    setLastRefresh(new Date());
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setLoading(false);
    isFetchingRef.current = false;
  }
}, [checking]);

// 초기 로드
useEffect(() => {
  if (!initialLoadDone.current) {
    initialLoadDone.current = true;
    fetchData();
  }
}, [fetchData]);

// 자동 새로고침: checking 중에는 스킵
useEffect(() => {
  const interval = setInterval(() => {
    if (!checking) fetchData();
  }, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [checking, fetchData]);

// 체크 실행 핸들러
const handleRunCheck = async () => {
  setChecking(true);
  try {
    const result = await reportMonitoringApi.runFullCheck();
    setMonitoringResult(result);
    setLastRefresh(new Date());
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Check failed');
  } finally {
    setChecking(false);
  }
};
```

---

## 3. Sidebar 수정

**위치**: `apps/frontend-next/src/components/Sidebar.tsx` ETL Monitoring 섹션에 추가

```typescript
{
  section: 'ETL Monitoring',
  items: [
    { href: '/dashboard/etl/wind', label: 'Wind ETL', icon: (...) },
    { href: '/dashboard/etl/minkabu', label: 'Minkabu ETL', icon: (...) },
    // 🔴 추가
    {
      href: '/dashboard/report-monitoring',
      label: 'Report Monitoring',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
  ],
}
```

---

## 스타일링 가이드

### KPICard Props
```typescript
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  status?: 'success' | 'warning' | 'error' | 'neutral';
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'currency' | 'tokens';
}
```

### KPI Card 사용 예시
```typescript
import KPICard from '@/components/kpi/KPICard';
import { FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  <KPICard
    title="전체 리포트"
    value={4}
    format="number"
    icon={<FileText className="w-5 h-5" />}
    status="neutral"
  />
  <KPICard
    title="정상"
    value={summary.healthyReports}
    format="number"
    icon={<CheckCircle className="w-5 h-5" />}
    status={summary.healthyReports === 4 ? 'success' : 'warning'}
    subtitle={`${summary.healthyReports}/4`}
  />
  <KPICard
    title="누락 데이터"
    value={summary.totalMissing}
    format="number"
    icon={<AlertTriangle className="w-5 h-5" />}
    status={summary.totalMissing > 0 ? 'error' : 'success'}
  />
  <KPICard
    title="오래된 데이터"
    value={summary.totalStale}
    format="number"
    icon={<Clock className="w-5 h-5" />}
    status={summary.totalStale > 0 ? 'warning' : 'success'}
  />
</div>
```

### 색상 팔레트
- 배경: `bg-slate-800`, `bg-slate-900`
- 텍스트: `text-white` (주), `text-slate-400` (부)
- 성공: `text-emerald-400`, `bg-emerald-900/30`
- 경고: `text-yellow-400`, `bg-amber-900/30`
- 에러: `text-rose-500`, `bg-rose-900/30`

### 상태 배지
```typescript
const getStatusBadge = (hasCriticalIssues: boolean) => {
  if (hasCriticalIssues) {
    return (
      <span className="px-2 py-1 text-xs rounded border bg-rose-900/30 text-rose-400 border-rose-700">
        이슈 발견
      </span>
    );
  }
  return (
    <span className="px-2 py-1 text-xs rounded border bg-emerald-900/30 text-emerald-400 border-emerald-700">
      정상
    </span>
  );
};
```

### 리포트 타입 한글 라벨
```typescript
const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  ai_stock: 'AI Stock',
  commodity: 'Commodity',
  forex: 'Forex',
  dividend: 'Dividend',
};
```

---

## 참고 파일 (구현 시 반드시 확인)

| 파일 | 참고 내용 |
|------|----------|
| `apps/frontend-next/src/services/windEtlService.ts` | 서비스 클라이언트 패턴 |
| `apps/frontend-next/src/app/dashboard/etl/wind/page.tsx` | 페이지 컴포넌트 패턴 |
| `apps/frontend-next/src/components/kpi/KPICard.tsx` | KPI 카드 props |
| `apps/frontend-next/src/components/Sidebar.tsx` | 네비게이션 구조 |
| `apps/backend/src/report-monitoring/interfaces/report-target.interface.ts` | 백엔드 타입 정의 |
| `apps/backend/src/report-monitoring/report-monitoring.controller.ts` | API 엔드포인트 |

---

## 검증 방법

1. **백엔드 서버 실행**: `pnpm dev:backend`
2. **프론트엔드 서버 실행**: `pnpm dev:frontend-next`
3. **페이지 접속**: `http://localhost:3001/dashboard/report-monitoring`
4. **확인 항목**:
   - [ ] 페이지 로드 시 health → status API 순차 호출
   - [ ] DB 미연결 시 경고 메시지 + 체크 버튼 비활성화
   - [ ] 체크 미실행 시 EmptyState 표시
   - [ ] KPI 카드에 summary 데이터 표시
   - [ ] 리포트별 테이블 렌더링 (이슈 행 강조)
   - [ ] "즉시 체크 실행" 버튼 동작 (중복 클릭 방지)
   - [ ] 5분 자동 새로고침 동작 (체크 중 스킵)
   - [ ] 이슈 상세 접기/펼치기 동작
   - [ ] 사이드바 Report Monitoring 링크 동작

---

## 백엔드 API 엔드포인트 참고

| Method | Endpoint | 설명 | 응답 타입 |
|--------|----------|------|----------|
| GET | `/api/report-monitoring/health` | 헬스 상태 | `HealthResponse` |
| GET | `/api/report-monitoring/status` | 마지막 체크 결과 | `MonitoringResult \| NoCheckMessage` |
| POST | `/api/report-monitoring/check` | 전체 체크 실행 | `MonitoringResult` |
