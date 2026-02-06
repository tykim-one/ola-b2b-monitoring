'use client';

import { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, Calendar, RefreshCw, TrendingUp, FileText, AlertTriangle, AlertCircle, Database, HelpCircle } from 'lucide-react';
import { useServiceContext } from '@/hooks/useServiceContext';
import { Dashboard } from '@/components/compound/Dashboard';
import KPICard from '@/components/kpi/KPICard';
import { DataTable, type Column } from '@/components/compound/DataTable';
import { Chart } from '@/components/compound/Chart';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useReportMonitoringHealth,
  useReportMonitoringResult,
  useRunReportCheck,
  useReportMonitoringHistory,
} from '@/hooks/queries/use-report-monitoring';
import type { ReportType, ReportCheckResult, MonitoringHistoryItem } from '@/services/reportMonitoringService';
import apiClient from '@/lib/api-client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// ======= Report Batch Status Component =======
const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  ai_stock: 'AI Stock',
  commodity: 'Commodity',
  forex: 'Forex',
  dividend: 'Dividend',
};

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ReportBatchStatus({ serviceName }: { serviceName: string }) {
  const { data: health, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useReportMonitoringHealth();
  const dbConnected = health?.db.connected ?? false;
  const { data: monitoringResult, isLoading: resultLoading, error: resultError } = useReportMonitoringResult(dbConnected);
  const runCheckMutation = useRunReportCheck();

  const isLoading = healthLoading || (dbConnected && resultLoading);
  const error = healthError || resultError;
  const summary = monitoringResult?.summary;
  const checking = runCheckMutation.isPending;

  const { data: historyData, isLoading: historyLoading } = useReportMonitoringHistory(dbConnected);

  const handleRunCheck = () => {
    runCheckMutation.mutate();
  };

  const reportColumns: Column<ReportCheckResult>[] = [
    {
      key: 'reportType',
      header: '리포트',
      render: (value) => (
        <span className="text-gray-900 font-medium">
          {REPORT_TYPE_LABELS[value as ReportType]}
        </span>
      ),
    },
    {
      key: 'hasCriticalIssues',
      header: '상태',
      render: (value) => (
        <StatusBadge
          variant={value ? 'error' : 'success'}
          label={value ? '이슈 발견' : '정상'}
        />
      ),
    },
    {
      key: 'totalTargets',
      header: '대상',
      align: 'right',
      render: (value) => <span className="text-gray-600">{String(value)}</span>,
    },
    {
      key: 'missingSymbols',
      header: '누락',
      align: 'right',
      render: (value) => {
        const arr = value as string[];
        return arr.length > 0 ? (
          <span className="text-rose-400 font-medium">{arr.length}</span>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
    },
    {
      key: 'incompleteSymbols',
      header: '불완전',
      align: 'right',
      render: (value) => {
        const arr = value as string[];
        return arr.length > 0 ? (
          <span className="text-orange-400 font-medium">{arr.length}</span>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
    },
    {
      key: 'staleSymbols',
      header: '오래됨',
      align: 'right',
      render: (value) => {
        const arr = value as string[];
        return arr.length > 0 ? (
          <span className="text-amber-400 font-medium">{arr.length}</span>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
    },
    {
      key: 'completeCount',
      header: '정상',
      align: 'right',
      render: (value) => <span className="text-emerald-400">{String(value)}</span>,
    },
  ];

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

  return (
    <Dashboard isLoading={isLoading} error={error as Error | null} refetch={refetchHealth}>
      <Dashboard.Header
        title={`${serviceName} 배치 현황`}
        rightContent={
          <div className="text-gray-500 text-sm">
            {health && !isLoading && `마지막 갱신: ${new Date().toLocaleTimeString('ko-KR')}`}
          </div>
        }
      />

      <Dashboard.Skeleton layout="kpi-only" />
      <Dashboard.Error />

      <Dashboard.Content>
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={handleRunCheck}
            disabled={checking || !dbConnected}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              checking || !dbConnected
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {checking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                체크 실행 중...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                즉시 체크 실행
              </>
            )}
          </button>
          {!dbConnected && (
            <span className="text-amber-400 text-sm flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              DB 연결 필요
            </span>
          )}
        </div>

        {!monitoringResult ? (
          <EmptyState
            variant="solid"
            icon={<FileText className="w-16 h-16 text-gray-400" />}
            title="아직 체크가 실행되지 않았습니다"
            description="리포트 데이터 상태를 확인하려면 체크를 실행하세요."
            action={{
              label: '첫 체크 실행',
              onClick: handleRunCheck,
              icon: <Play className="w-4 h-4" />,
              disabled: checking || !dbConnected,
            }}
          />
        ) : (
          <>
            <Dashboard.KPISection columns={4}>
              <KPICard
                title="전체 리포트"
                value={summary?.totalReports ?? 4}
                format="number"
                icon={<FileText className="w-5 h-5" />}
                status="neutral"
              />
              <KPICard
                title="정상"
                value={summary?.healthyReports ?? 0}
                format="number"
                icon={<CheckCircle className="w-5 h-5" />}
                status={summary?.healthyReports === summary?.totalReports ? 'success' : 'warning'}
              />
              <KPICard
                title="이슈 리포트"
                value={(summary?.totalReports ?? 0) - (summary?.healthyReports ?? 0)}
                format="number"
                icon={<AlertTriangle className="w-5 h-5" />}
                status={(summary?.totalReports ?? 0) - (summary?.healthyReports ?? 0) > 0 ? 'error' : 'success'}
              />
              <KPICard
                title="오래됨"
                value={summary?.totalStale ?? 0}
                format="number"
                icon={<Clock className="w-5 h-5" />}
                status={(summary?.totalStale ?? 0) > 0 ? 'warning' : 'success'}
              />
            </Dashboard.KPISection>

            <Dashboard.TableSection title="리포트별 상태" className="mb-8">
              <DataTable
                data={monitoringResult.results}
                columns={reportColumns}
                variant="card"
                rowKey="reportType"
              >
                <DataTable.Content>
                  <DataTable.Header />
                  <DataTable.Body
                    emptyMessage="리포트 데이터가 없습니다"
                    rowClassName={(row) =>
                      (row as ReportCheckResult).hasCriticalIssues
                        ? 'bg-rose-50 hover:bg-rose-50'
                        : ''
                    }
                  />
                </DataTable.Content>
              </DataTable>
            </Dashboard.TableSection>
          </>
        )}

        {/* System Status Footer */}
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            시스템 상태
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* DB connection */}
            <div className="space-y-2">
              <div className="text-sm text-gray-500">데이터베이스</div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={dbConnected ? 'text-emerald-400' : 'text-rose-400'}>
                  {dbConnected ? '연결됨' : '연결 안됨'}
                </span>
                {health?.db.type && (
                  <span className="text-gray-400 text-sm">({health.db.type})</span>
                )}
              </div>
            </div>

            {/* Scheduler */}
            <div className="space-y-2">
              <div className="text-sm text-gray-500">스케줄러</div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    health?.scheduler.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                <span
                  className={health?.scheduler.isRunning ? 'text-emerald-400' : 'text-gray-500'}
                >
                  {health?.scheduler.isRunning ? '실행 중' : '중지됨'}
                </span>
              </div>
              {health?.scheduler && (
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Cron: {health.scheduler.cronExpression}</div>
                  <div>Timezone: {health.scheduler.timezone}</div>
                  {health.scheduler.nextExecution && (
                    <div>다음 실행: {formatDateTime(health.scheduler.nextExecution)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Target files */}
            <div className="space-y-2">
              <div className="text-sm text-gray-500">타겟 파일</div>
              <div className="space-y-1">
                {health?.targetFiles.map((file) => (
                  <div key={file.reportType} className="flex items-center gap-2 text-sm">
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">{file.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

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
      </Dashboard.Content>
    </Dashboard>
  );
}

// ======= ETL 타입용 인터페이스 (프론트엔드 UI용) =======
interface ETLRun {
  id: string;
  status: 'processing' | 'completed' | 'failed' | 'queued';
  startTime: string;
  endTime?: string;
  filesProcessed?: number;
  recordsProcessed?: number;
  errorMessage?: string;
}

interface ETLSummary {
  processing: number;
  queued: number;
  completed: number;
  failed: number;
  successRate: number;
  todayProcessed: number;
}

interface TrendData {
  date: string;
  count: number;
}

// ======= 백엔드 API 응답 타입 (WindETL DTO) =======
interface WindETLRunAPI {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  filesProcessed: number;
  totalRecords: number;
  errors: string[] | null;
}

interface WindETLSummaryAPI {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  successRate: number;
  avgFilesProcessed: number;
  todayTotalFiles: number;
  todayTotalRecords: number;
}

interface WindETLTrendAPI {
  period: string;
  runCount: number;
  totalFilesProcessed: number;
}

// ======= 백엔드 API 응답 타입 (MinkabuETL DTO) =======
interface MinkabuETLRunAPI {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  articlesFetched: number;
  todayHeadlines: number;
  errors: string[] | null;
}

interface MinkabuETLSummaryAPI {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  successRate: number;
  avgArticlesFetched: number;
  todayTotalArticles: number;
  todayTotalHeadlines: number;
}

interface MinkabuETLTrendAPI {
  period: string;
  runCount: number;
  totalArticlesFetched: number;
}

// ======= 백엔드 → 프론트엔드 데이터 매핑 함수 =======
function mapWindETLRun(raw: WindETLRunAPI): ETLRun {
  const statusMap: Record<string, ETLRun['status']> = {
    running: 'processing',
    success: 'completed',
    completed: 'completed',
    failed: 'failed',
    pending: 'queued',
    queued: 'queued',
  };
  return {
    id: String(raw.id),
    status: statusMap[raw.status?.toLowerCase()] || 'queued',
    startTime: raw.startedAt,
    endTime: raw.finishedAt || undefined,
    filesProcessed: raw.filesProcessed,
    recordsProcessed: raw.totalRecords,
    errorMessage: raw.errors?.[0],
  };
}

function mapWindETLSummary(raw: WindETLSummaryAPI): ETLSummary {
  return {
    processing: raw.runningCount || 0,
    queued: 0, // 백엔드에 queued 필드 없음
    completed: raw.successCount || 0,
    failed: raw.failureCount || 0,
    successRate: raw.successRate || 0,
    todayProcessed: raw.todayTotalFiles || 0,
  };
}

function mapWindETLTrend(raw: WindETLTrendAPI): TrendData {
  return {
    date: raw.period,
    count: raw.totalFilesProcessed || 0,
  };
}

// ======= Minkabu ETL 매핑 함수 =======
function mapMinkabuETLRun(raw: MinkabuETLRunAPI): ETLRun {
  const statusMap: Record<string, ETLRun['status']> = {
    running: 'processing',
    success: 'completed',
    completed: 'completed',
    failed: 'failed',
    pending: 'queued',
    queued: 'queued',
  };
  return {
    id: String(raw.id),
    status: statusMap[raw.status?.toLowerCase()] || 'queued',
    startTime: raw.startedAt,
    endTime: raw.finishedAt || undefined,
    filesProcessed: raw.articlesFetched,
    recordsProcessed: raw.todayHeadlines,
    errorMessage: raw.errors?.[0],
  };
}

function mapMinkabuETLSummary(raw: MinkabuETLSummaryAPI): ETLSummary {
  return {
    processing: raw.runningCount || 0,
    queued: 0,
    completed: raw.successCount || 0,
    failed: raw.failureCount || 0,
    successRate: raw.successRate || 0,
    todayProcessed: raw.todayTotalArticles || 0,
  };
}

function mapMinkabuETLTrend(raw: MinkabuETLTrendAPI): TrendData {
  return {
    date: raw.period,
    count: raw.totalArticlesFetched || 0,
  };
}

// 서비스별 레이블 설정
function getETLLabels(serviceId: string | undefined) {
  if (serviceId === 'minkabu-etl') {
    return {
      primaryField: '수집 기사',
      secondaryField: '헤드라인',
      todayLabel: '기사 수',
    };
  }
  // Wind ETL 및 기본값
  return {
    primaryField: '파일',
    secondaryField: '레코드',
    todayLabel: '파일 수',
  };
}

export default function ServiceStatusPage() {
  const ctx = useServiceContext();
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ETL 타입 상태
  const [runs, setRuns] = useState<ETLRun[]>([]);
  const [etlSummary, setEtlSummary] = useState<ETLSummary | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);

  const serviceType = ctx?.config?.type;
  const serviceId = ctx?.serviceId;
  const etlApiPrefix = ctx?.etlApiPrefix || ctx?.apiPrefix || '';
  const etlLabels = getETLLabels(serviceId);

  const fetchETLData = async () => {
    if (!etlApiPrefix) return;

    setIsLoading(true);
    setError(null);
    try {
      const [runsRes, summaryRes, trendRes] = await Promise.all([
        apiClient.get(`${etlApiPrefix}/runs?limit=20`),
        apiClient.get(`${etlApiPrefix}/summary`),
        apiClient.get(`${etlApiPrefix}/trend/daily?days=${dateRange.days}`),
      ]);
      // ETL API 응답 구조: { success: true, data: [...] }
      const runsRaw = runsRes.data?.data ?? runsRes.data;
      const summaryRaw = summaryRes.data?.data ?? summaryRes.data;
      const trendRaw = trendRes.data?.data ?? trendRes.data;
      // 서비스 타입에 따라 다른 매핑 함수 사용
      const isMinkabu = serviceId === 'minkabu-etl';
      setRuns(Array.isArray(runsRaw)
        ? runsRaw.map(isMinkabu ? mapMinkabuETLRun : mapWindETLRun)
        : []);
      setEtlSummary(summaryRaw
        ? (isMinkabu ? mapMinkabuETLSummary(summaryRaw) : mapWindETLSummary(summaryRaw))
        : null);
      setTrend(Array.isArray(trendRaw)
        ? trendRaw.map(isMinkabu ? mapMinkabuETLTrend : mapWindETLTrend)
        : []);
    } catch {
      // 목업 데이터로 대체
      setRuns([
        { id: '1', status: 'completed', startTime: new Date().toISOString(), filesProcessed: 150, recordsProcessed: 12500 },
        { id: '2', status: 'processing', startTime: new Date().toISOString(), filesProcessed: 45 },
        { id: '3', status: 'queued', startTime: new Date().toISOString() },
      ]);
      setEtlSummary({ processing: 1, queued: 2, completed: 45, failed: 3, successRate: 93.8, todayProcessed: 156 });
      setTrend([
        { date: '2025-02-01', count: 120 },
        { date: '2025-02-02', count: 145 },
        { date: '2025-02-03', count: 132 },
        { date: '2025-02-04', count: 168 },
        { date: '2025-02-05', count: 156 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = () => {
    if (serviceType === 'pipeline') {
      fetchETLData();
    }
  };

  // ctx 객체 대신 원시값(etlApiPrefix, serviceType)을 의존성으로 사용
  // 이렇게 하면 객체 참조 변경으로 인한 불필요한 재실행 방지
  useEffect(() => {
    if (ctx && serviceType === 'pipeline') {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etlApiPrefix, dateRange.days, serviceType]);

  if (!ctx) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-gray-50">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
          <p className="text-rose-600">서비스 컨텍스트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: string): string => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  // Batch 타입 렌더링 (IBK 리포트 배치)
  if (serviceType === 'batch') {
    return <ReportBatchStatus serviceName={ctx.config?.name || ctx.serviceId} />;
  }

  // ETL 타입 렌더링
  if (serviceType === 'pipeline') {
    const getETLStatusBadge = (status: ETLRun['status']) => {
      const styles = {
        queued: 'bg-gray-100 text-gray-600',
        processing: 'bg-blue-100 text-blue-600',
        completed: 'bg-emerald-100 text-emerald-600',
        failed: 'bg-rose-100 text-rose-600',
      };
      const labels = {
        queued: '대기',
        processing: '처리 중',
        completed: '완료',
        failed: '실패',
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
          {labels[status]}
        </span>
      );
    };

    const runColumns: Column<ETLRun>[] = [
      { key: 'id', header: 'ID',
        render: (v) => <span className="font-mono text-xs text-gray-500">{(v as string).slice(0, 8)}</span>,
      },
      { key: 'status', header: '상태', align: 'center',
        render: (v) => getETLStatusBadge(v as ETLRun['status']),
      },
      { key: 'startTime', header: '시작 시간', align: 'center',
        render: (v) => <span className="text-gray-500 text-xs">{formatDate(v as string)}</span>,
      },
      { key: 'filesProcessed', header: etlLabels.primaryField, align: 'center',
        render: (v) => <span className="text-gray-600">{(v as number)?.toLocaleString() || '-'}</span>,
      },
      { key: 'recordsProcessed', header: etlLabels.secondaryField, align: 'center',
        render: (v) => <span className="text-gray-600">{(v as number)?.toLocaleString() || '-'}</span>,
      },
      { key: 'endTime', header: '완료 시간', align: 'center',
        render: (v) => v ? <span className="text-gray-500 text-xs">{formatDate(v as string)}</span> : <span className="text-gray-300">-</span>,
      },
    ];

    const chartData = trend
      .filter((d) => d.date) // 빈 날짜 필터링
      .map((d) => {
        const date = new Date(d.date);
        const isValidDate = !isNaN(date.getTime());
        return {
          name: isValidDate
            ? date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
            : d.date, // 파싱 실패 시 원본 사용
          value: d.count,
        };
      })
      .reverse(); // 최신→과거 순서를 과거→최신 순서로 변경

    const serviceName = ctx.config?.name || ctx.serviceId;

    return (
      <Dashboard isLoading={isLoading} error={error} refetch={fetchData}>
        <Dashboard.Header
          title={`${serviceName} 처리 현황`}
          rightContent={
            <div className="flex items-center gap-3">
              <DateRangeFilter
                defaultPreset="week"
                onChange={(range) => setDateRange(range)}
              />
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </button>
            </div>
          }
        />

        <Dashboard.Skeleton layout="kpi-chart" />
        <Dashboard.Error />

        <Dashboard.Content>
          <Dashboard.KPISection columns={4}>
            <KPICard
              title="처리 중"
              value={etlSummary?.processing || 0}
              format="number"
              icon={<Play className="w-5 h-5" />}
              status={etlSummary?.processing && etlSummary.processing > 0 ? 'warning' : 'neutral'}
            />
            <KPICard
              title="대기"
              value={etlSummary?.queued || 0}
              format="number"
              icon={<Clock className="w-5 h-5" />}
              status="neutral"
            />
            <KPICard
              title="성공률"
              value={etlSummary?.successRate || 0}
              format="percentage"
              icon={<CheckCircle className="w-5 h-5" />}
              status={(etlSummary?.successRate || 0) >= 95 ? 'success' : (etlSummary?.successRate || 0) >= 80 ? 'warning' : 'error'}
            />
            <KPICard
              title="오늘 처리량"
              value={etlSummary?.todayProcessed || 0}
              format="number"
              icon={<TrendingUp className="w-5 h-5" />}
              status="neutral"
              subtitle={etlLabels.todayLabel}
            />
          </Dashboard.KPISection>

          <Dashboard.ChartsSection columns={1}>
            <Chart title={`일별 처리량 (${dateRange.days}일)`} height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </AreaChart>
            </Chart>
          </Dashboard.ChartsSection>

          <div className="mb-6">
            <DataTable data={Array.isArray(runs) ? runs : []} columns={runColumns} rowKey="id">
              <DataTable.Toolbar>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  최근 실행 기록
                </h3>
                <DataTable.Stats>
                  <DataTable.StatItem label="완료" value={`${etlSummary?.completed || 0}개`} colorClass="text-emerald-400" />
                  <DataTable.StatItem label="실패" value={`${etlSummary?.failed || 0}개`} colorClass="text-rose-400" />
                </DataTable.Stats>
              </DataTable.Toolbar>
              <DataTable.Content>
                <DataTable.Header />
                <DataTable.Body emptyMessage="실행 기록이 없습니다." />
              </DataTable.Content>
              <DataTable.Footer />
            </DataTable>
          </div>
        </Dashboard.Content>
      </Dashboard>
    );
  }

  // Fallback (no matching service type)
  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
        <p className="text-rose-600">알 수 없는 서비스 타입입니다: {serviceType}</p>
      </div>
    </div>
  );
}
