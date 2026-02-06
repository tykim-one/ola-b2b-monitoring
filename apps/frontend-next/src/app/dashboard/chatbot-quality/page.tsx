'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingUp, CheckCircle2, Users } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import { Dashboard } from '@/components/compound/Dashboard';
import { DataTable, Column } from '@/components/compound/DataTable';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  getEmergingPatterns,
  getSentimentAnalysis,
  getRephrasedQueries,
  getTenantQualitySummary,
} from '@/services/chatbotQualityService';
import type {
  EmergingQueryPattern,
  SentimentAnalysisResult,
  RephrasedQueryPattern,
  TenantQualitySummary,
} from '@ola/shared-types';

const PROJECT_ID = 'ibks';
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// Table column definitions
const emergingPatternsColumns: Column<EmergingQueryPattern>[] = [
  {
    key: 'normalizedQuery',
    header: '질문 패턴',
    sortable: true,
    render: (value) => (
      <span className="text-gray-900 font-medium max-w-md block truncate" title={String(value)}>
        {String(value)}
      </span>
    ),
  },
  {
    key: 'patternType',
    header: '유형',
    sortable: true,
    align: 'center',
    render: (value) => (
      <StatusBadge
        variant={value === 'NEW' ? 'success' : 'warning'}
        label={value === 'NEW' ? '신규' : '급증'}
        shape="pill"
      />
    ),
  },
  {
    key: 'recentCount',
    header: '최근 발생',
    sortable: true,
    align: 'right',
    render: (value) => (
      <span className="text-cyan-400 font-semibold">{Number(value).toLocaleString()}</span>
    ),
  },
  {
    key: 'historicalCount',
    header: '과거 평균',
    sortable: true,
    align: 'right',
    render: (value) => Number(value).toLocaleString(),
  },
  {
    key: 'growthRate',
    header: '증가율',
    sortable: true,
    align: 'right',
    render: (value) => {
      if (value === null) return <span className="text-emerald-400">NEW</span>;
      const rate = Number(value);
      return (
        <span className={rate > 200 ? 'text-rose-400 font-semibold' : 'text-amber-400'}>
          {rate.toFixed(0)}%
        </span>
      );
    },
  },
];

const sentimentColumns: Column<SentimentAnalysisResult>[] = [
  {
    key: 'timestamp',
    header: '시간',
    sortable: true,
    render: (value) => {
      const date = new Date(String(value));
      return (
        <span className="text-gray-500 text-sm">
          {date.toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      );
    },
  },
  {
    key: 'sentimentFlag',
    header: '감정 상태',
    sortable: true,
    align: 'center',
    render: (value) => {
      const labels = {
        FRUSTRATED: '불만',
        EMOTIONAL: '감정적',
        URGENT: '긴급',
        NEUTRAL: '중립',
      };
      const variants = {
        FRUSTRATED: 'error' as const,
        EMOTIONAL: 'warning' as const,
        URGENT: 'error' as const,
        NEUTRAL: 'neutral' as const,
      };
      return (
        <StatusBadge
          variant={variants[value as keyof typeof variants]}
          label={labels[value as keyof typeof labels]}
          shape="pill"
        />
      );
    },
  },
  {
    key: 'userInput',
    header: '유저 질문',
    sortable: false,
    render: (value) => (
      <span className="text-gray-900 max-w-lg block truncate" title={String(value)}>
        {String(value)}
      </span>
    ),
  },
  {
    key: 'tenantId',
    header: '테넌트',
    sortable: true,
    render: (value) => <span className="text-violet-400 font-medium">{String(value)}</span>,
  },
  {
    key: 'success',
    header: '성공',
    sortable: true,
    align: 'center',
    render: (value) => (
      value ?
        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> :
        <AlertTriangle className="w-4 h-4 text-rose-400 mx-auto" />
    ),
  },
];

const rephrasedQueriesColumns: Column<RephrasedQueryPattern>[] = [
  {
    key: 'sessionId',
    header: '세션 ID',
    sortable: true,
    render: (value) => (
      <span className="text-gray-500 text-xs">{String(value).slice(0, 12)}...</span>
    ),
  },
  {
    key: 'tenantId',
    header: '테넌트',
    sortable: true,
    render: (value) => <span className="text-violet-400 font-medium">{String(value)}</span>,
  },
  {
    key: 'queryCount',
    header: '질문 수',
    sortable: true,
    align: 'right',
    render: (value) => (
      <span className={Number(value) >= 5 ? 'text-rose-400 font-semibold' : 'text-amber-400'}>
        {Number(value)}
      </span>
    ),
  },
  {
    key: 'similarityScore',
    header: '유사도',
    sortable: true,
    align: 'right',
    render: (value) => (
      <span className="text-cyan-400">{(Number(value) * 100).toFixed(0)}%</span>
    ),
  },
  {
    key: 'hasResolution',
    header: '해결 여부',
    sortable: true,
    align: 'center',
    render: (value) => (
      value ?
        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> :
        <AlertTriangle className="w-4 h-4 text-rose-400 mx-auto" />
    ),
  },
  {
    key: 'queries',
    header: '질문 내용',
    sortable: false,
    render: (value) => {
      const queries = value as string[];
      return (
        <div className="space-y-1 max-w-md">
          {queries.slice(0, 2).map((q, i) => (
            <div key={i} className="text-xs text-gray-600 truncate" title={q}>
              {i + 1}. {q}
            </div>
          ))}
          {queries.length > 2 && (
            <span className="text-xs text-gray-400">+{queries.length - 2} more...</span>
          )}
        </div>
      );
    },
  },
];

const tenantQualityColumns: Column<TenantQualitySummary>[] = [
  {
    key: 'tenantId',
    header: '테넌트',
    sortable: true,
    render: (value) => <span className="text-violet-400 font-medium">{String(value)}</span>,
  },
  {
    key: 'totalSessions',
    header: '총 세션',
    sortable: true,
    align: 'right',
    render: (value) => Number(value).toLocaleString(),
  },
  {
    key: 'sessionSuccessRate',
    header: '세션 성공률',
    sortable: true,
    align: 'right',
    render: (value) => {
      const rate = Number(value);
      return (
        <span className={rate >= 80 ? 'text-emerald-400' : rate >= 60 ? 'text-amber-400' : 'text-rose-400'}>
          {rate.toFixed(1)}%
        </span>
      );
    },
  },
  {
    key: 'frustrationRate',
    header: '불만율',
    sortable: true,
    align: 'right',
    render: (value) => {
      const rate = Number(value);
      return (
        <span className={rate > 20 ? 'text-rose-400 font-semibold' : rate > 10 ? 'text-amber-400' : 'text-gray-500'}>
          {rate.toFixed(1)}%
        </span>
      );
    },
  },
  {
    key: 'avgTurnsPerSession',
    header: '평균 대화 턴',
    sortable: true,
    align: 'right',
    render: (value) => Number(value).toFixed(1),
  },
  {
    key: 'avgSessionDurationMinutes',
    header: '평균 세션 길이',
    sortable: true,
    align: 'right',
    render: (value) => `${Number(value).toFixed(1)}분`,
  },
];

export default function ChatbotQualityPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  // Data fetching with dynamic days
  const emergingQuery = useQuery({
    queryKey: ['chatbotQuality', 'emerging', PROJECT_ID, dateRange.days],
    queryFn: () => getEmergingPatterns(PROJECT_ID, dateRange.days, dateRange.days * 4),
    staleTime: CACHE_TIME,
  });

  const sentimentQuery = useQuery({
    queryKey: ['chatbotQuality', 'sentiment', PROJECT_ID, dateRange.days],
    queryFn: () => getSentimentAnalysis(PROJECT_ID, dateRange.days),
    staleTime: CACHE_TIME,
  });

  const rephrasedQuery = useQuery({
    queryKey: ['chatbotQuality', 'rephrased', PROJECT_ID, dateRange.days],
    queryFn: () => getRephrasedQueries(PROJECT_ID, dateRange.days),
    staleTime: CACHE_TIME,
  });

  const tenantQualityQuery = useQuery({
    queryKey: ['chatbotQuality', 'tenantSummary', PROJECT_ID, dateRange.days],
    queryFn: () => getTenantQualitySummary(PROJECT_ID, dateRange.days),
    staleTime: CACHE_TIME,
  });

  // Progressive loading: KPI가 의존하는 쿼리만 기준
  const isLoading = tenantQualityQuery.isLoading && sentimentQuery.isLoading && emergingQuery.isLoading;

  const error =
    emergingQuery.error ||
    sentimentQuery.error ||
    rephrasedQuery.error ||
    tenantQualityQuery.error;

  const emergingPatterns = emergingQuery.data ?? [];
  const sentimentResults = sentimentQuery.data ?? [];
  const rephrasedQueries = rephrasedQuery.data ?? [];
  const tenantQuality = tenantQualityQuery.data ?? [];

  // Calculate KPIs
  const { totalFrustrated, newPatternsCount, avgSessionSuccessRate, avgFrustrationRate } = useMemo(() => ({
    totalFrustrated: sentimentResults.filter(
      (r) => r.sentimentFlag === 'FRUSTRATED' || r.sentimentFlag === 'EMOTIONAL'
    ).length,
    newPatternsCount: emergingPatterns.filter((p) => p.patternType === 'NEW').length,
    avgSessionSuccessRate: tenantQuality.length > 0
      ? tenantQuality.reduce((sum, t) => sum + t.sessionSuccessRate, 0) / tenantQuality.length
      : 0,
    avgFrustrationRate: tenantQuality.length > 0
      ? tenantQuality.reduce((sum, t) => sum + t.frustrationRate, 0) / tenantQuality.length
      : 0,
  }), [sentimentResults, emergingPatterns, tenantQuality]);

  return (
    <Dashboard isLoading={isLoading} error={error as Error | null}>
      <Dashboard.Header
        title="챗봇 품질 분석"
        rightContent={
          <DateRangeFilter
            defaultPreset="week"
            onChange={(range) => setDateRange(range)}
          />
        }
      />

      <Dashboard.Skeleton />
      <Dashboard.Error />

      <Dashboard.Content>
        {/* KPI Cards */}
        <Dashboard.KPISection columns={4}>
          <KPICard
            title="불만 표현 쿼리"
            value={totalFrustrated}
            format="number"
            icon={<AlertTriangle className="w-5 h-5" />}
            status={totalFrustrated > 50 ? 'error' : totalFrustrated > 20 ? 'warning' : 'neutral'}
          />
          <KPICard
            title="신규 패턴 발견"
            value={newPatternsCount}
            format="number"
            icon={<TrendingUp className="w-5 h-5" />}
            status={newPatternsCount > 10 ? 'warning' : 'neutral'}
          />
          <KPICard
            title="세션 성공률"
            value={avgSessionSuccessRate}
            format="percentage"
            icon={<CheckCircle2 className="w-5 h-5" />}
            status={avgSessionSuccessRate >= 80 ? 'success' : avgSessionSuccessRate >= 60 ? 'warning' : 'error'}
          />
          <KPICard
            title="평균 불만율"
            value={avgFrustrationRate}
            format="percentage"
            icon={<Users className="w-5 h-5" />}
            status={avgFrustrationRate > 20 ? 'error' : avgFrustrationRate > 10 ? 'warning' : 'success'}
          />
        </Dashboard.KPISection>

        {/* Emerging Patterns Table */}
        <Dashboard.TableSection title="신규 질문 패턴 (Emerging Patterns)">
          {emergingQuery.isLoading ? (
            <div className="h-48 bg-slate-800/50 rounded-lg animate-pulse" />
          ) : (
            <DataTable
              data={emergingPatterns}
              columns={emergingPatternsColumns}
              searchFields={['normalizedQuery']}
            >
              <DataTable.Toolbar>
                <DataTable.Search placeholder="질문 패턴 검색..." />
              </DataTable.Toolbar>
              <DataTable.Content>
                <DataTable.Header />
                <DataTable.Body emptyMessage="신규 질문 패턴이 없습니다" />
              </DataTable.Content>
              <DataTable.Pagination pageSize={20} />
              <DataTable.Footer />
            </DataTable>
          )}
        </Dashboard.TableSection>

        {/* Sentiment Analysis Table */}
        <Dashboard.TableSection title="감정 분석 (Sentiment Analysis)">
          {sentimentQuery.isLoading ? (
            <div className="h-48 bg-slate-800/50 rounded-lg animate-pulse" />
          ) : (
            <DataTable
              data={sentimentResults}
              columns={sentimentColumns}
              searchFields={['userInput', 'tenantId']}
            >
              <DataTable.Toolbar>
                <DataTable.Search placeholder="질문 또는 테넌트 검색..." />
              </DataTable.Toolbar>
              <DataTable.Content>
                <DataTable.Header />
                <DataTable.Body emptyMessage="감정 분석 데이터가 없습니다" />
              </DataTable.Content>
              <DataTable.Pagination pageSize={20} />
              <DataTable.Footer />
            </DataTable>
          )}
        </Dashboard.TableSection>

        {/* Rephrased Queries Table */}
        <Dashboard.TableSection title="재질문 패턴 (Rephrased Queries)">
          {rephrasedQuery.isLoading ? (
            <div className="h-48 bg-slate-800/50 rounded-lg animate-pulse" />
          ) : (
            <DataTable
              data={rephrasedQueries}
              columns={rephrasedQueriesColumns}
              searchFields={['sessionId', 'tenantId']}
            >
              <DataTable.Toolbar>
                <DataTable.Search placeholder="세션 ID 또는 테넌트 검색..." />
              </DataTable.Toolbar>
              <DataTable.Content>
                <DataTable.Header />
                <DataTable.Body emptyMessage="재질문 패턴이 없습니다" />
              </DataTable.Content>
              <DataTable.Pagination pageSize={20} />
              <DataTable.Footer />
            </DataTable>
          )}
        </Dashboard.TableSection>

        {/* Tenant Quality Summary Table */}
        <Dashboard.TableSection title="테넌트 품질 요약 (Tenant Quality Summary)">
          {tenantQualityQuery.isLoading ? (
            <div className="h-48 bg-slate-800/50 rounded-lg animate-pulse" />
          ) : (
            <DataTable
              data={tenantQuality}
              columns={tenantQualityColumns}
              searchFields={['tenantId']}
            >
              <DataTable.Toolbar>
                <DataTable.Search placeholder="테넌트 검색..." />
              </DataTable.Toolbar>
              <DataTable.Content>
                <DataTable.Header />
                <DataTable.Body emptyMessage="테넌트 품질 데이터가 없습니다" />
              </DataTable.Content>
              <DataTable.Pagination pageSize={20} />
              <DataTable.Footer />
            </DataTable>
          )}
        </Dashboard.TableSection>
      </Dashboard.Content>
    </Dashboard>
    
  );
}
