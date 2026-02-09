'use client';

import { useState, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Activity, MessageSquare, TrendingUp, FileQuestion, Users, Clock } from 'lucide-react';
import { useQualityDashboard } from '@/hooks/queries/use-quality';
import { Dashboard } from '@/components/compound/Dashboard';
import KPICard from '@/components/kpi/KPICard';
import { DataTable, type Column } from '@/components/compound/DataTable';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';

const TokenEfficiencyTrendChart = dynamic(
  () => import('@/components/charts/TokenEfficiencyTrendChart'),
  { ssr: false, loading: () => <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" /> }
);

const QueryResponseScatterPlot = dynamic(
  () => import('@/components/charts/QueryResponseScatterPlot'),
  { ssr: false, loading: () => <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" /> }
);

const FAQAnalysisSection = dynamic(
  () => import('@/components/faq-analysis/FAQAnalysisSection'),
  { loading: () => <div className="h-48 bg-slate-800/50 rounded-lg animate-pulse" /> }
);
import { PROJECT_ID } from '@/lib/config';

export default function QualityPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 30 });

  const {
    efficiencyTrend, correlation, repeatedPatterns, kpis,
    isLoading, isEfficiencyLoading, isCorrelationLoading, isPatternsLoading,
    error, refetch,
  } = useQualityDashboard(PROJECT_ID, dateRange.days);

  // ---- Helpers for RepeatedQueries ----
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

  // Total occurrences for stats
  const totalOccurrences = useMemo(() => repeatedPatterns.reduce((sum: number, d: any) => sum + d.occurrence_count, 0), [repeatedPatterns]);

  const repeatedColumns: Column<any>[] = [
    { key: 'query_pattern', header: '질문 패턴',
      render: (v, _, index) => (
        <div className="flex items-start gap-2">
          <span className="text-gray-400 text-xs w-6">{index + 1}.</span>
          <span className="text-gray-900 truncate max-w-[400px]" title={v as string}>{v as string}</span>
        </div>
      ),
    },
    { key: 'occurrence_count', header: '반복', align: 'center' as const,
      render: (v) => (
        <span className={`font-medium ${(v as number) >= 10 ? 'text-rose-400' : (v as number) >= 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
          {v as number}
        </span>
      ),
    },
    { key: 'unique_tenants', header: '테넌트', align: 'center' as const,
      render: (v) => <span className="text-gray-600">{v as number}</span>,
    },
    { key: 'avg_response_length', header: '평균 응답', align: 'center' as const,
      render: (v) => (
        <span className="text-gray-600">
          {(v as number) >= 1000 ? `${((v as number) / 1000).toFixed(1)}K` : (v as number)}
        </span>
      ),
    },
    { key: 'last_seen', header: '최근', align: 'center' as const,
      render: (v) => <span className="text-gray-500 text-xs">{formatDate(v as string)}</span>,
    },
  ];

  return (
    <Dashboard isLoading={isLoading} error={error as Error | null} refetch={refetch}>
      <Dashboard.Header
        title="품질 모니터링"
        rightContent={
          <DateRangeFilter
            defaultPreset="month"
            onChange={(range) => setDateRange(range)}
          />
        }
      />

      <Dashboard.Skeleton layout="kpi-chart" />
      <Dashboard.Error />

      <Dashboard.Content>
        {/* KPI Cards */}
        <Dashboard.KPISection columns={4}>
          <KPICard
            title="평균 효율성"
            value={`${kpis.avgEfficiency.toFixed(2)}x`}
            icon={<Activity className="w-5 h-5" />}
            status={kpis.avgEfficiency >= 1 ? 'success' : kpis.avgEfficiency >= 0.5 ? 'warning' : 'error'}
            subtitle="출력/입력 토큰 비율"
          />
          <KPICard
            title="총 요청 수"
            value={kpis.totalRequests}
            format="number"
            icon={<TrendingUp className="w-5 h-5" />}
            status="neutral"
            subtitle={`${dateRange.days}일 기준`}
          />
          <KPICard
            title="평균 응답 길이"
            value={
              kpis.avgResponseLength >= 1000
                ? `${(kpis.avgResponseLength / 1000).toFixed(1)}K`
                : Math.round(kpis.avgResponseLength)
            }
            icon={<MessageSquare className="w-5 h-5" />}
            status="neutral"
            subtitle="문자 수"
          />
          <KPICard
            title="FAQ 후보"
            value={`${kpis.highFrequencyPatterns}/${kpis.totalFAQCandidates}`}
            icon={<FileQuestion className="w-5 h-5" />}
            status={kpis.highFrequencyPatterns > 5 ? 'warning' : 'success'}
            subtitle="고빈도/전체 패턴"
          />
        </Dashboard.KPISection>

        {/* Charts Row */}
        <Suspense fallback={<div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />}>
          <Dashboard.ChartsSection columns={2}>
            {isEfficiencyLoading ? (
              <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />
            ) : (
              <TokenEfficiencyTrendChart
                data={efficiencyTrend}
                title={`토큰 효율성 트렌드 (${dateRange.days}일)`}
              />
            )}
            {isCorrelationLoading ? (
              <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />
            ) : (
              <QueryResponseScatterPlot
                data={correlation}
                title="질문-응답 길이 상관관계"
              />
            )}
          </Dashboard.ChartsSection>
        </Suspense>

        {/* Repeated Queries Table */}
        <div className="mb-8">
          {isPatternsLoading ? (
            <div className="h-48 bg-slate-800/50 rounded-lg animate-pulse" />
          ) : (
            <>
              <DataTable data={repeatedPatterns} columns={repeatedColumns}>
                <DataTable.Toolbar>
                  <h3 className="text-lg font-semibold text-gray-900">반복 질문 패턴 (FAQ 후보)</h3>
                  <DataTable.Stats>
                    <DataTable.StatItem label="총 패턴" value={`${repeatedPatterns.length}개`} colorClass="text-blue-400" />
                    <DataTable.StatItem label="총 반복" value={`${totalOccurrences.toLocaleString()}회`} colorClass="text-emerald-400" />
                  </DataTable.Stats>
                </DataTable.Toolbar>
                <DataTable.Content>
                  <DataTable.Header />
                  <DataTable.Body
                    expandable
                    renderExpandedRow={(row: any) => (
                      <div className="space-y-2">
                        <div className="text-gray-500 text-xs">전체 질문 패턴:</div>
                        <div className="text-gray-900 bg-white p-3 rounded-lg text-xs break-all">{row.query_pattern}</div>
                        <div className="flex gap-6 mt-3 text-xs">
                          <div>
                            <span className="text-gray-500">첫 발생:</span>{' '}
                            <span className="text-gray-600">{formatDate(row.first_seen)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">평균 토큰:</span>{' '}
                            <span className="text-gray-600">{row.avg_output_tokens.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    emptyMessage="반복 질문 패턴이 없습니다."
                  />
                </DataTable.Content>
                <DataTable.Pagination pageSize={20} />
                <DataTable.Footer />
              </DataTable>
            </>
          )}
        </div>


        {/* FAQ Analysis Section */}
        <div className="mb-8">
          <FAQAnalysisSection />
        </div>
      </Dashboard.Content>
    </Dashboard>
  );
}
