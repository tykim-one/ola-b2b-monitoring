# 리포트 모니터링 체크 이력 저장 + 이력 테이블 구현 가이드

> 다음 세션에서 이 문서를 참고하여 구현을 진행하세요.
> 프롬프트: "`.claude/plans/report-monitoring-history.md` 문서를 읽고 구현을 진행해줘"

## 배경

IBK 리포트 배치 현황 페이지(`/dashboard/services/ibk/status`)의 리포트 모니터링 체크 결과가 현재 **메모리에만 캐싱**되어 서버 재시작 시 사라짐. 체크 결과를 SQLite(Prisma)에 영구 저장하고, 프론트엔드에서 이력 테이블로 조회할 수 있도록 구현.

## 현재 상태

- `ReportMonitoringService.runFullCheck()` → `MonitoringResult` 반환
- `private lastResult: MonitoringResult | null` — 인메모리 캐싱만 존재
- `ReportMonitoringModule`에 `DatabaseModule` 미 import
- 프론트엔드: `ReportBatchStatus` 컴포넌트가 현재 체크 결과만 표시 (이력 없음)

---

## 수정 파일 8개 + 실행 순서

### Step 1. Prisma 스키마 추가

**파일**: `apps/backend/prisma/schema.prisma`
**위치**: 파일 끝 (line 436 이후)

```prisma
// ==================== 리포트 모니터링 이력 테이블 ====================

/// 리포트 모니터링 체크 이력
model ReportMonitoringHistory {
  id               String   @id @default(uuid())

  // 트리거 소스
  trigger          String   @default("manual")  // "manual" | "scheduled"

  // 요약 필드 (필터링/정렬용 — 개별 컬럼)
  totalReports     Int      @default(0)
  healthyReports   Int      @default(0)
  issueReports     Int      @default(0)
  totalMissing     Int      @default(0)
  totalIncomplete  Int      @default(0)
  totalSuspicious  Int      @default(0)
  totalStale       Int      @default(0)

  // 전체 상태
  hasIssues        Boolean  @default(false)  // issueReports > 0

  // 상세 결과 (JSON 문자열)
  results          String   // JSON: ReportCheckResult[]

  // 타임스탬프
  checkedAt        DateTime @default(now())

  @@index([checkedAt])
  @@index([hasIssues])
}
```

**스키마 적용 명령어**:
```bash
cd apps/backend
pnpm prisma db push
pnpm prisma:generate
```

---

### Step 2. 모듈에 DatabaseModule import

**파일**: `apps/backend/src/report-monitoring/report-monitoring.module.ts`

```typescript
// 추가할 import
import { DatabaseModule } from '../admin/database/database.module';

// imports 배열에 추가
@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    DatabaseModule,  // 추가
  ],
  // ... 나머지 동일
})
```

---

### Step 3. 서비스에 저장/조회 로직 추가

**파일**: `apps/backend/src/report-monitoring/report-monitoring.service.ts`

#### 3-1. PrismaService 주입
```typescript
import { PrismaService } from '../admin/database/prisma.service';

// constructor에 추가
constructor(
  // ... 기존 의존성
  private readonly prisma: PrismaService,  // 추가
) {}
```

#### 3-2. runFullCheck 시그니처 변경
```typescript
// 기존: async runFullCheck(): Promise<MonitoringResult>
// 변경:
async runFullCheck(trigger: 'manual' | 'scheduled' = 'manual'): Promise<MonitoringResult>
```

`this.lastResult = monitoringResult;` 라인 직후에 추가:
```typescript
await this.saveHistory(monitoringResult, trigger);
```

#### 3-3. saveHistory private 메서드 추가
```typescript
/**
 * 체크 결과를 DB에 저장
 */
private async saveHistory(
  result: MonitoringResult,
  trigger: 'manual' | 'scheduled',
): Promise<void> {
  try {
    await this.prisma.reportMonitoringHistory.create({
      data: {
        trigger,
        totalReports: result.summary.totalReports,
        healthyReports: result.summary.healthyReports,
        issueReports: result.summary.issueReports,
        totalMissing: result.summary.totalMissing,
        totalIncomplete: result.summary.totalIncomplete,
        totalSuspicious: result.summary.totalSuspicious,
        totalStale: result.summary.totalStale,
        hasIssues: result.summary.issueReports > 0,
        results: JSON.stringify(result.results),
        checkedAt: result.timestamp,
      },
    });
    this.logger.debug('Monitoring result saved to history');
  } catch (error) {
    this.logger.error(`Failed to save history: ${error.message}`);
    // 이력 저장 실패가 체크 자체를 중단시키지 않도록
  }
}
```

#### 3-4. getHistory 메서드 추가
```typescript
/**
 * 체크 이력 조회 (페이지네이션)
 */
async getHistory(params: {
  limit?: number;
  offset?: number;
  hasIssues?: boolean;
}): Promise<{
  items: Array<{
    id: string;
    trigger: string;
    totalReports: number;
    healthyReports: number;
    issueReports: number;
    totalMissing: number;
    totalIncomplete: number;
    totalSuspicious: number;
    totalStale: number;
    hasIssues: boolean;
    checkedAt: Date;
  }>;
  total: number;
}> {
  const where: Record<string, unknown> = {};
  if (params.hasIssues !== undefined) {
    where.hasIssues = params.hasIssues;
  }

  const [items, total] = await Promise.all([
    this.prisma.reportMonitoringHistory.findMany({
      where,
      orderBy: { checkedAt: 'desc' },
      take: params.limit || 20,
      skip: params.offset || 0,
      select: {
        id: true,
        trigger: true,
        totalReports: true,
        healthyReports: true,
        issueReports: true,
        totalMissing: true,
        totalIncomplete: true,
        totalSuspicious: true,
        totalStale: true,
        hasIssues: true,
        checkedAt: true,
        // results JSON은 목록에서 제외 (대역폭 절약)
      },
    }),
    this.prisma.reportMonitoringHistory.count({ where }),
  ]);

  return { items, total };
}
```

---

### Step 4. 스케줄러 trigger 타입 전달

**파일**: `apps/backend/src/report-monitoring/report-monitoring.scheduler.ts`

#### 4-1. executeCheck() 내부
```typescript
// 기존: const result = await this.monitoringService.runFullCheck();
// 변경:
const result = await this.monitoringService.runFullCheck('scheduled');
```

#### 4-2. triggerManually()
```typescript
// 기존: await this.executeCheck();
// 변경: (수동 트리거는 'manual'로 직접 호출)
async triggerManually(): Promise<void> {
  this.logger.log('Manual trigger requested');
  await this.monitoringService.runFullCheck('manual');
}
```

---

### Step 5. 컨트롤러에 history 엔드포인트 추가

**파일**: `apps/backend/src/report-monitoring/report-monitoring.controller.ts`

기존 엔드포인트들 뒤에 추가:

```typescript
/**
 * 체크 이력 조회
 */
@Get('history')
@ApiOperation({ summary: '체크 이력 조회 (페이지네이션)' })
@ApiResponse({ status: 200, description: '체크 이력 목록' })
async getHistory(
  @Query('limit') limit?: string,
  @Query('offset') offset?: string,
  @Query('hasIssues') hasIssues?: string,
) {
  return this.monitoringService.getHistory({
    limit: limit ? parseInt(limit, 10) : 20,
    offset: offset ? parseInt(offset, 10) : 0,
    hasIssues: hasIssues !== undefined ? hasIssues === 'true' : undefined,
  });
}
```

**API 경로**: `GET /api/report-monitoring/history?limit=20&offset=0&hasIssues=true`

---

### Step 6. 프론트엔드 서비스에 타입 + API 추가

**파일**: `apps/frontend-next/src/services/reportMonitoringService.ts`

#### 6-1. 타입 추가 (기존 타입 정의 뒤에)
```typescript
export interface MonitoringHistoryItem {
  id: string;
  trigger: 'manual' | 'scheduled';
  totalReports: number;
  healthyReports: number;
  issueReports: number;
  totalMissing: number;
  totalIncomplete: number;
  totalSuspicious: number;
  totalStale: number;
  hasIssues: boolean;
  checkedAt: string;
}

export interface MonitoringHistoryResponse {
  items: MonitoringHistoryItem[];
  total: number;
}
```

#### 6-2. API 메서드 추가 (reportMonitoringApi 객체 내부)
```typescript
async getHistory(params?: {
  limit?: number;
  offset?: number;
  hasIssues?: boolean;
}): Promise<MonitoringHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.hasIssues !== undefined) searchParams.set('hasIssues', String(params.hasIssues));

  const qs = searchParams.toString();
  const response = await fetch(`${API_BASE}/history${qs ? '?' + qs : ''}`);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
},
```

---

### Step 7. React Query 훅 추가

**파일**: `apps/frontend-next/src/hooks/queries/use-report-monitoring.ts`

#### 7-1. import에 타입 추가
```typescript
import type { MonitoringHistoryResponse } from '@/services/reportMonitoringService';
```

#### 7-2. query key에 history 추가
```typescript
export const reportMonitoringKeys = {
  all: ['report-monitoring'] as const,
  health: () => [...reportMonitoringKeys.all, 'health'] as const,
  result: () => [...reportMonitoringKeys.all, 'result'] as const,
  history: () => [...reportMonitoringKeys.all, 'history'] as const,  // 추가
};
```

#### 7-3. useReportMonitoringHistory 훅 추가
```typescript
/**
 * 모니터링 이력 조회 (100건 fetch, 클라이언트 페이징)
 */
export function useReportMonitoringHistory(dbConnected: boolean) {
  return useQuery({
    queryKey: reportMonitoringKeys.history(),
    queryFn: () => reportMonitoringApi.getHistory({ limit: 100 }),
    enabled: dbConnected,
    staleTime: CACHE_TIME.SHORT,
  });
}
```

#### 7-4. useRunReportCheck의 onSuccess에 history 무효화 추가
```typescript
onSuccess: (data: MonitoringResult) => {
  queryClient.setQueryData(reportMonitoringKeys.result(), data);
  queryClient.invalidateQueries({ queryKey: reportMonitoringKeys.health() });
  queryClient.invalidateQueries({ queryKey: reportMonitoringKeys.history() });  // 추가
},
```

---

### Step 8. 프론트엔드 이력 테이블 UI

**파일**: `apps/frontend-next/src/app/dashboard/services/[serviceId]/status/page.tsx`

`ReportBatchStatus` 컴포넌트 내부에서:

#### 8-1. import 추가
```typescript
import { useReportMonitoringHistory } from '@/hooks/queries/use-report-monitoring';
import type { MonitoringHistoryItem } from '@/services/reportMonitoringService';
```

#### 8-2. 훅 호출 (기존 hooks 옆에)
```typescript
const { data: historyData, isLoading: historyLoading } = useReportMonitoringHistory(dbConnected);
```

#### 8-3. 컬럼 정의
```typescript
const historyColumns: Column<MonitoringHistoryItem>[] = [
  {
    key: 'checkedAt', header: '체크 시간',
    render: (v) => (
      <span className="text-gray-600 text-sm">
        {new Date(v as string).toLocaleString('ko-KR', {
          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        })}
      </span>
    ),
  },
  {
    key: 'trigger', header: '트리거', align: 'center',
    render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        v === 'scheduled' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
      }`}>
        {v === 'scheduled' ? '자동' : '수동'}
      </span>
    ),
  },
  {
    key: 'hasIssues', header: '상태', align: 'center',
    render: (v) => (
      <StatusBadge variant={v ? 'error' : 'success'} label={v ? '이슈' : '정상'} />
    ),
  },
  {
    key: 'totalMissing', header: '누락', align: 'right',
    render: (v) => (v as number) > 0
      ? <span className="text-rose-400 font-medium">{v as number}</span>
      : <span className="text-gray-400">0</span>,
  },
  {
    key: 'totalIncomplete', header: '불완전', align: 'right',
    render: (v) => (v as number) > 0
      ? <span className="text-orange-400 font-medium">{v as number}</span>
      : <span className="text-gray-400">0</span>,
  },
  {
    key: 'totalStale', header: '오래됨', align: 'right',
    render: (v) => (v as number) > 0
      ? <span className="text-amber-400 font-medium">{v as number}</span>
      : <span className="text-gray-400">0</span>,
  },
  {
    key: 'healthyReports', header: '정상', align: 'right',
    render: (_, row) => {
      const item = row as MonitoringHistoryItem;
      return <span className="text-emerald-400">{item.healthyReports}/{item.totalReports}</span>;
    },
  },
];
```

#### 8-4. JSX 추가 (시스템 상태 footer 뒤, `</Dashboard.Content>` 앞)
```tsx
{/* 체크 이력 */}
<div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm mt-8">
  <DataTable
    data={historyData?.items ?? []}
    columns={historyColumns}
    variant="card"
    rowKey="id"
  >
    <DataTable.Toolbar>
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-500" />
        체크 이력
      </h3>
      {historyData && (
        <DataTable.Stats>
          <DataTable.StatItem label="전체" value={`${historyData.total}건`} colorClass="text-gray-500" />
        </DataTable.Stats>
      )}
    </DataTable.Toolbar>
    <DataTable.Content>
      <DataTable.Header />
      <DataTable.Body emptyMessage={historyLoading ? '로딩 중...' : '체크 이력이 없습니다.'} />
    </DataTable.Content>
    <DataTable.Pagination pageSize={10} />
  </DataTable>
</div>
```

---

## 검증 체크리스트

- [ ] `pnpm prisma db push` 성공
- [ ] `pnpm prisma:generate` 성공
- [ ] TypeScript 빌드 에러 없음: `npx tsc --noEmit`
- [ ] `POST /api/report-monitoring/check` → 결과 반환 + DB 저장
- [ ] `GET /api/report-monitoring/history` → 저장된 이력 반환
- [ ] 프론트엔드 이력 테이블 표시
- [ ] 체크 실행 후 이력 테이블 자동 갱신

## 설계 참고

- **1 테이블 설계**: summary 필드는 개별 컬럼(필터/정렬 효율), 상세 데이터는 JSON
- **results JSON 제외**: 목록 조회 시 `select`로 제외하여 응답 경량화
- **클라이언트 페이징**: 체크 빈도가 하루 1-3회이므로 100건 fetch + DataTable.Pagination
- **에러 격리**: `saveHistory` 실패 시 체크 자체는 중단되지 않음
