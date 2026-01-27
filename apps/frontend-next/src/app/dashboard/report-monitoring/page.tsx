'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Database,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Play,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import {
  reportMonitoringApi,
  isMonitoringResult,
  type MonitoringResult,
  type HealthResponse,
  type ReportType,
  type ReportCheckResult,
} from '@/services/reportMonitoringService';

// 리포트 타입 한글 라벨
const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  ai_stock: 'AI Stock',
  commodity: 'Commodity',
  forex: 'Forex',
  dividend: 'Dividend',
};

// 최대 표시 개수
const MAX_DISPLAY_COUNT = 10;

export default function ReportMonitoringPage() {
  const [monitoringResult, setMonitoringResult] = useState<MonitoringResult | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false); // 체크 실행 중 (버튼 disabled)
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // 이슈 상세 접기/펼치기
  const [expandedReports, setExpandedReports] = useState<Set<ReportType>>(new Set());

  const isFetchingRef = useRef<boolean>(false);
  const initialLoadDone = useRef<boolean>(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current || checking) return; // 체크 중이면 스킵
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
          setMonitoringResult(null); // "No check" 상태
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  // 접기/펼치기 토글
  const toggleExpand = (reportType: ReportType) => {
    setExpandedReports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportType)) {
        newSet.delete(reportType);
      } else {
        newSet.add(reportType);
      }
      return newSet;
    });
  };

  // 상태 배지
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

  // 날짜 포맷
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 로딩 상태 (초기 로드 중에만)
  if (loading && !health) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-slate-400">데이터 로딩 중...</div>
      </div>
    );
  }

  // 에러 상태
  if (error && !health) {
    return (
      <div className="p-8">
        <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400">
          오류: {error}
        </div>
      </div>
    );
  }

  const dbConnected = health?.db.connected ?? false;
  const summary = monitoringResult?.summary;

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">리포트 데이터 모니터링</h2>
        <div className="text-slate-400 text-sm">
          마지막 갱신: {lastRefresh.toLocaleTimeString('ko-KR')}
        </div>
      </div>

      {/* Action Button */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={handleRunCheck}
          disabled={checking || !dbConnected}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            checking || !dbConnected
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
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
        {error && (
          <span className="text-rose-400 text-sm">{error}</span>
        )}
      </div>

      {/* 조건부 렌더링 */}
      {!monitoringResult ? (
        /* A. 체크 미실행 시 EmptyState */
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <div className="flex justify-center mb-4">
            <FileText className="w-16 h-16 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            아직 체크가 실행되지 않았습니다
          </h3>
          <p className="text-slate-400 mb-6">
            리포트 데이터 상태를 확인하려면 체크를 실행하세요.
          </p>
          <button
            onClick={handleRunCheck}
            disabled={checking || !dbConnected}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              checking || !dbConnected
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
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
                첫 체크 실행
              </>
            )}
          </button>
        </div>
      ) : (
        /* B. 체크 결과 있을 시 */
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
              subtitle={`${summary?.healthyReports ?? 0}/${summary?.totalReports ?? 4}`}
            />
            <KPICard
              title="🔴 누락"
              value={summary?.totalMissing ?? 0}
              format="number"
              icon={<AlertTriangle className="w-5 h-5" />}
              status={(summary?.totalMissing ?? 0) > 0 ? 'error' : 'success'}
            />
            <KPICard
              title="🟠 불완전"
              value={summary?.totalIncomplete ?? 0}
              format="number"
              icon={<AlertCircle className="w-5 h-5" />}
              status={(summary?.totalIncomplete ?? 0) > 0 ? 'error' : 'success'}
            />
            <KPICard
              title="🟡 확인필요"
              value={summary?.totalSuspicious ?? 0}
              format="number"
              icon={<HelpCircle className="w-5 h-5" />}
              status={(summary?.totalSuspicious ?? 0) > 0 ? 'warning' : 'success'}
            />
            <KPICard
              title="⚠️ 오래됨"
              value={summary?.totalStale ?? 0}
              format="number"
              icon={<Clock className="w-5 h-5" />}
              status={(summary?.totalStale ?? 0) > 0 ? 'warning' : 'success'}
            />
          </div>

          {/* 리포트별 상태 테이블 */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">리포트별 상태</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-700">
                    <th className="pb-3 text-slate-400 font-medium">리포트</th>
                    <th className="pb-3 text-slate-400 font-medium">상태</th>
                    <th className="pb-3 text-slate-400 font-medium text-right">대상</th>
                    <th className="pb-3 text-slate-400 font-medium text-right">🔴 누락</th>
                    <th className="pb-3 text-slate-400 font-medium text-right">🟠 불완전</th>
                    <th className="pb-3 text-slate-400 font-medium text-right">🟡 확인필요</th>
                    <th className="pb-3 text-slate-400 font-medium text-right">⚠️ 오래됨</th>
                    <th className="pb-3 text-slate-400 font-medium text-right">✅ 정상</th>
                    <th className="pb-3 text-slate-400 font-medium text-right">체크 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoringResult.results.map((result: ReportCheckResult) => (
                    <tr
                      key={result.reportType}
                      className={`border-b border-slate-700/50 ${
                        result.hasCriticalIssues
                          ? 'bg-rose-900/10 hover:bg-rose-900/20'
                          : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <td className="py-3 text-white font-medium">
                        {REPORT_TYPE_LABELS[result.reportType]}
                      </td>
                      <td className="py-3">{getStatusBadge(result.hasCriticalIssues)}</td>
                      <td className="py-3 text-slate-300 text-right">{result.totalTargets}</td>
                      <td className="py-3 text-right">
                        {result.missingSymbols.length > 0 ? (
                          <span className="text-rose-400 font-medium">
                            {result.missingSymbols.length}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {result.incompleteSymbols.length > 0 ? (
                          <span className="text-orange-400 font-medium">
                            {result.incompleteSymbols.length}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {result.suspiciousSymbols.length > 0 ? (
                          <span className="text-yellow-400 font-medium">
                            {result.suspiciousSymbols.length}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {result.staleSymbols.length > 0 ? (
                          <span className="text-amber-400 font-medium">
                            {result.staleSymbols.length}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 text-emerald-400 text-right">{result.completeCount}</td>
                      <td className="py-3 text-slate-400 text-right">
                        {formatDateTime(result.checkedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 이슈 상세 (접기/펼치기) */}
          {monitoringResult.results.some(
            (r) =>
              r.missingSymbols.length > 0 ||
              r.incompleteSymbols.length > 0 ||
              r.suspiciousSymbols.length > 0 ||
              r.staleSymbols.length > 0
          ) && (
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                이슈 상세
              </h3>
              <div className="space-y-4">
                {monitoringResult.results
                  .filter(
                    (r) =>
                      r.missingSymbols.length > 0 ||
                      r.incompleteSymbols.length > 0 ||
                      r.suspiciousSymbols.length > 0 ||
                      r.staleSymbols.length > 0
                  )
                  .map((result) => {
                    const isExpanded = expandedReports.has(result.reportType);
                    const missingToShow = isExpanded
                      ? result.missingSymbols
                      : result.missingSymbols.slice(0, MAX_DISPLAY_COUNT);
                    const incompleteToShow = isExpanded
                      ? result.incompleteDetails
                      : result.incompleteDetails.slice(0, MAX_DISPLAY_COUNT);
                    const suspiciousToShow = isExpanded
                      ? result.suspiciousDetails
                      : result.suspiciousDetails.slice(0, MAX_DISPLAY_COUNT);
                    const staleToShow = isExpanded
                      ? result.staleDetails
                      : result.staleDetails.slice(0, MAX_DISPLAY_COUNT);

                    const hasMore =
                      result.missingSymbols.length > MAX_DISPLAY_COUNT ||
                      result.incompleteDetails.length > MAX_DISPLAY_COUNT ||
                      result.suspiciousDetails.length > MAX_DISPLAY_COUNT ||
                      result.staleDetails.length > MAX_DISPLAY_COUNT;

                    return (
                      <div
                        key={result.reportType}
                        className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-white font-medium">
                            {REPORT_TYPE_LABELS[result.reportType]}
                          </span>
                          {hasMore && (
                            <button
                              onClick={() => toggleExpand(result.reportType)}
                              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  접기
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  펼치기
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* 🔴 누락 심볼 */}
                        {result.missingSymbols.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-rose-400 mb-2 font-medium">
                              🔴 누락 ({result.missingSymbols.length}건) - 데이터 없음
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {missingToShow.map((symbol) => (
                                <span
                                  key={symbol}
                                  className="px-2 py-1 bg-rose-900/30 text-rose-300 text-xs rounded border border-rose-800/50"
                                >
                                  {symbol}
                                </span>
                              ))}
                              {!isExpanded && result.missingSymbols.length > MAX_DISPLAY_COUNT && (
                                <span className="px-2 py-1 text-slate-400 text-xs">
                                  외 {result.missingSymbols.length - MAX_DISPLAY_COUNT}건
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 🟠 불완전 심볼 */}
                        {result.incompleteDetails.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-orange-400 mb-2 font-medium">
                              🟠 불완전 ({result.incompleteDetails.length}건) - 필수 필드 NULL
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {incompleteToShow.map((detail) => (
                                <span
                                  key={detail.symbol}
                                  className="px-2 py-1 bg-orange-900/30 text-orange-300 text-xs rounded border border-orange-800/50"
                                  title={`NULL 필드: ${detail.missingFields.join(', ')}`}
                                >
                                  {detail.symbol} ({detail.missingFields.join(', ')})
                                </span>
                              ))}
                              {!isExpanded && result.incompleteDetails.length > MAX_DISPLAY_COUNT && (
                                <span className="px-2 py-1 text-slate-400 text-xs">
                                  외 {result.incompleteDetails.length - MAX_DISPLAY_COUNT}건
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 🟡 확인필요 심볼 */}
                        {result.suspiciousDetails.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-yellow-400 mb-2 font-medium">
                              🟡 확인필요 ({result.suspiciousDetails.length}건) - 전날과 값 동일
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {suspiciousToShow.map((detail) => (
                                <span
                                  key={detail.symbol}
                                  className="px-2 py-1 bg-yellow-900/30 text-yellow-300 text-xs rounded border border-yellow-800/50"
                                  title={`변동 없는 필드: ${detail.unchangedFields.join(', ')}`}
                                >
                                  {detail.symbol} ({detail.unchangedFields.join(', ')})
                                </span>
                              ))}
                              {!isExpanded && result.suspiciousDetails.length > MAX_DISPLAY_COUNT && (
                                <span className="px-2 py-1 text-slate-400 text-xs">
                                  외 {result.suspiciousDetails.length - MAX_DISPLAY_COUNT}건
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ⚠️ 오래된 심볼 */}
                        {result.staleDetails.length > 0 && (
                          <div>
                            <div className="text-xs text-amber-400 mb-2 font-medium">
                              ⚠️ 오래됨 ({result.staleDetails.length}건) - 어제 이전 데이터
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {staleToShow.map((detail) => (
                                <span
                                  key={detail.symbol}
                                  className="px-2 py-1 bg-amber-900/30 text-amber-300 text-xs rounded border border-amber-800/50"
                                  title={`마지막 업데이트: ${formatDateTime(detail.updatedAt)}`}
                                >
                                  {detail.symbol} ({detail.daysBehind}일 전)
                                </span>
                              ))}
                              {!isExpanded && result.staleDetails.length > MAX_DISPLAY_COUNT && (
                                <span className="px-2 py-1 text-slate-400 text-xs">
                                  외 {result.staleDetails.length - MAX_DISPLAY_COUNT}건
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {/* 시스템 상태 Footer */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          시스템 상태
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DB 연결 상태 */}
          <div className="space-y-2">
            <div className="text-sm text-slate-400">데이터베이스</div>
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
                <span className="text-slate-500 text-sm">({health.db.type})</span>
              )}
            </div>
          </div>

          {/* 스케줄러 상태 */}
          <div className="space-y-2">
            <div className="text-sm text-slate-400">스케줄러</div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  health?.scheduler.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span
                className={health?.scheduler.isRunning ? 'text-emerald-400' : 'text-slate-400'}
              >
                {health?.scheduler.isRunning ? '실행 중' : '중지됨'}
              </span>
            </div>
            {health?.scheduler && (
              <div className="text-xs text-slate-500 space-y-1">
                <div>Cron: {health.scheduler.cronExpression}</div>
                <div>Timezone: {health.scheduler.timezone}</div>
                {health.scheduler.nextExecution && (
                  <div>다음 실행: {formatDateTime(health.scheduler.nextExecution)}</div>
                )}
              </div>
            )}
          </div>

          {/* 타겟 파일 목록 */}
          <div className="space-y-2">
            <div className="text-sm text-slate-400">타겟 파일</div>
            <div className="space-y-1">
              {health?.targetFiles.map((file) => (
                <div key={file.reportType} className="flex items-center gap-2 text-sm">
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-300">{file.filename}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
