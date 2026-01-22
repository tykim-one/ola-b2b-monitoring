'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Activity, MessageSquare, TrendingUp, FileQuestion } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import TokenEfficiencyTrendChart from '@/components/charts/TokenEfficiencyTrendChart';
import QueryResponseScatterPlot from '@/components/charts/QueryResponseScatterPlot';
import RepeatedQueriesTable from '@/components/charts/RepeatedQueriesTable';
import FAQAnalysisSection from '@/components/faq-analysis/FAQAnalysisSection';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/ibks/api`;

interface EfficiencyTrendData {
  date: string;
  avg_efficiency_ratio: number;
  min_efficiency_ratio: number;
  max_efficiency_ratio: number;
  total_requests: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
}

interface CorrelationData {
  tenant_id: string;
  query_length: number;
  response_length: number;
  input_tokens: number;
  output_tokens: number;
  efficiency_ratio: number;
  timestamp: string;
}

interface RepeatedQueryData {
  query_pattern: string;
  occurrence_count: number;
  unique_tenants: number;
  avg_response_length: number;
  avg_output_tokens: number;
  first_seen: string;
  last_seen: string;
}

export default function QualityPage() {
  const [efficiencyTrend, setEfficiencyTrend] = useState<EfficiencyTrendData[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationData[]>([]);
  const [repeatedPatterns, setRepeatedPatterns] = useState<RepeatedQueryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 30 });

  // AbortController를 사용한 요청 취소 관리
  const abortControllerRef = useRef<AbortController | null>(null);

  // 15분마다 자동 새로고침을 위한 트리거
  const [refreshKey, setRefreshKey] = useState(0);

  // 날짜 범위 변경 또는 새로고침 시 데이터 재조회
  useEffect(() => {
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [efficiencyRes, correlationRes, patternsRes] = await Promise.all([
          fetch(`${API_BASE}/quality/efficiency-trend?days=${dateRange.days}`),
          fetch(`${API_BASE}/quality/query-response-correlation?days=${dateRange.days}`),
          fetch(`${API_BASE}/quality/repeated-patterns?days=${dateRange.days}`),
        ]);

        if (!efficiencyRes.ok || !correlationRes.ok || !patternsRes.ok) {
          throw new Error('API 요청 실패');
        }

        const efficiencyData = await efficiencyRes.json();
        const correlationData = await correlationRes.json();
        const patternsData = await patternsRes.json();

        // 요청이 취소되지 않았을 때만 상태 업데이트
        if (!controller.signal.aborted) {
          setEfficiencyTrend(efficiencyData.data || []);
          setCorrelation(correlationData.data || []);
          setRepeatedPatterns(patternsData.data || []);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [dateRange.days, refreshKey]);

  // 15분마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // KPI 계산
  const avgEfficiency =
    efficiencyTrend.length > 0
      ? efficiencyTrend.reduce((sum, d) => sum + (d.avg_efficiency_ratio || 0), 0) /
        efficiencyTrend.length
      : 0;

  const totalRequests = efficiencyTrend.reduce((sum, d) => sum + d.total_requests, 0);

  const avgResponseLength =
    correlation.length > 0
      ? correlation.reduce((sum, d) => sum + d.response_length, 0) / correlation.length
      : 0;

  const totalFAQCandidates = repeatedPatterns.length;
  const highFrequencyPatterns = repeatedPatterns.filter((p) => p.occurrence_count >= 5).length;

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header - 항상 렌더링하여 DateRangeFilter가 unmount되지 않도록 함 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-3xl font-bold text-white">품질 모니터링</h2>
        <DateRangeFilter
          defaultPreset="month"
          onChange={(range) => setDateRange(range)}
        />
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400">데이터 로딩 중...</div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && !loading && (
        <div className="py-8">
          <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400">
            오류: {error}
          </div>
        </div>
      )}

      {/* 정상 콘텐츠 */}
      {!loading && !error && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="평균 효율성"
              value={`${avgEfficiency.toFixed(2)}x`}
              icon={<Activity className="w-5 h-5" />}
              status={avgEfficiency >= 1 ? 'success' : avgEfficiency >= 0.5 ? 'warning' : 'error'}
              subtitle="출력/입력 토큰 비율"
            />
            <KPICard
              title="총 요청 수"
              value={totalRequests}
              format="number"
              icon={<TrendingUp className="w-5 h-5" />}
              status="neutral"
              subtitle={`${dateRange.days}일 기준`}
            />
            <KPICard
              title="평균 응답 길이"
              value={avgResponseLength >= 1000 ? `${(avgResponseLength / 1000).toFixed(1)}K` : Math.round(avgResponseLength)}
              icon={<MessageSquare className="w-5 h-5" />}
              status="neutral"
              subtitle="문자 수"
            />
            <KPICard
              title="FAQ 후보"
              value={`${highFrequencyPatterns}/${totalFAQCandidates}`}
              icon={<FileQuestion className="w-5 h-5" />}
              status={highFrequencyPatterns > 5 ? 'warning' : 'success'}
              subtitle="고빈도/전체 패턴"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <TokenEfficiencyTrendChart
              data={efficiencyTrend}
              title={`토큰 효율성 트렌드 (${dateRange.days}일)`}
            />
            <QueryResponseScatterPlot
              data={correlation}
              title="질문-응답 길이 상관관계"
            />
          </div>

          {/* Repeated Queries Table */}
          <div className="mb-8">
            <RepeatedQueriesTable
              data={repeatedPatterns}
              title="반복 질문 패턴 (FAQ 후보)"
            />
          </div>

          {/* FAQ Analysis Section */}
          <div className="mb-8">
            <FAQAnalysisSection />
          </div>
        </>
      )}
    </div>
  );
}
