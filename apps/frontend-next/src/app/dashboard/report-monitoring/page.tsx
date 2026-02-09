'use client';

import React, { useState } from 'react';
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
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dashboard } from '@/components/compound/Dashboard';
import { DataTable, Column } from '@/components/compound/DataTable';
import {
  useReportMonitoringHealth,
  useReportMonitoringResult,
  useReportMonitoringHistory,
  useRunReportCheck,
} from '@/hooks/queries/use-report-monitoring';
import type {
  ReportType,
  ReportCheckResult,
  MonitoringHistoryItem,
} from '@/services/reportMonitoringService';

// ==================== Constants ====================

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  ai_stock: 'AI Stock',
  commodity: 'Commodity',
  forex: 'Forex',
  dividend: 'Dividend',
  summary: 'Summary',
};

const MAX_DISPLAY_COUNT = 10;

// ==================== DataTable Column Definitions ====================

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
    header: '🔴 누락',
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
    header: '🟠 불완전',
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
    key: 'suspiciousSymbols',
    header: '🟡 확인필요',
    align: 'right',
    render: (value) => {
      const arr = value as string[];
      return arr.length > 0 ? (
        <span className="text-yellow-400 font-medium">{arr.length}</span>
      ) : (
        <span className="text-gray-400">0</span>
      );
    },
  },
  {
    key: 'staleSymbols',
    header: '⚠️ 오래됨',
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
    header: '✅ 정상',
    align: 'right',
    render: (value) => <span className="text-emerald-400">{String(value)}</span>,
  },
  {
    key: 'checkedAt',
    header: '체크 시간',
    align: 'right',
    render: (value) => (
      <span className="text-gray-500">{formatDateTime(String(value))}</span>
    ),
  },
];

// ==================== Helpers ====================

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ==================== Issue Detail Section ====================

interface IssueDetailSectionProps {
  results: ReportCheckResult[];
}

function IssueDetailSection({ results }: IssueDetailSectionProps) {
  const [expandedReports, setExpandedReports] = useState<Set<ReportType>>(new Set());

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

  const resultsWithIssues = results.filter(
    (r) =>
      r.missingSymbols.length > 0 ||
      r.incompleteSymbols.length > 0 ||
      r.suspiciousSymbols.length > 0 ||
      r.staleSymbols.length > 0
  );

  if (resultsWithIssues.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        이슈 상세
      </h3>
      <div className="space-y-4">
        {resultsWithIssues.map((result) => {
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
              className="bg-gray-50 border border-gray-100 rounded-lg p-4"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-900 font-medium">
                  {REPORT_TYPE_LABELS[result.reportType]}
                </span>
                {hasMore && (
                  <button
                    onClick={() => toggleExpand(result.reportType)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
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

              {/* Missing symbols */}
              {result.missingSymbols.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-rose-400 mb-2 font-medium">
                    누락 ({result.missingSymbols.length}건) - 데이터 없음
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {missingToShow.map((symbol) => (
                      <span
                        key={symbol}
                        className="px-2 py-1 bg-rose-50 text-rose-600 text-xs rounded border border-rose-200"
                      >
                        {symbol}
                      </span>
                    ))}
                    {!isExpanded && result.missingSymbols.length > MAX_DISPLAY_COUNT && (
                      <span className="px-2 py-1 text-gray-500 text-xs">
                        외 {result.missingSymbols.length - MAX_DISPLAY_COUNT}건
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Incomplete symbols */}
              {result.incompleteDetails.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-orange-400 mb-2 font-medium">
                    불완전 ({result.incompleteDetails.length}건) - 필수 필드 NULL
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {incompleteToShow.map((detail) => (
                      <span
                        key={detail.symbol}
                        className="px-2 py-1 bg-orange-50 text-orange-300 text-xs rounded border border-orange-800/50"
                        title={`NULL 필드: ${detail.missingFields.join(', ')}`}
                      >
                        {detail.symbol} ({detail.missingFields.join(', ')})
                      </span>
                    ))}
                    {!isExpanded && result.incompleteDetails.length > MAX_DISPLAY_COUNT && (
                      <span className="px-2 py-1 text-gray-500 text-xs">
                        외 {result.incompleteDetails.length - MAX_DISPLAY_COUNT}건
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Suspicious symbols */}
              {result.suspiciousDetails.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-yellow-400 mb-2 font-medium">
                    확인필요 ({result.suspiciousDetails.length}건) - 전날과 값 동일
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suspiciousToShow.map((detail) => (
                      <span
                        key={detail.symbol}
                        className="px-2 py-1 bg-yellow-50 text-yellow-300 text-xs rounded border border-yellow-800/50"
                        title={`변동 없는 필드: ${detail.unchangedFields.join(', ')}`}
                      >
                        {detail.symbol} ({detail.unchangedFields.join(', ')})
                      </span>
                    ))}
                    {!isExpanded && result.suspiciousDetails.length > MAX_DISPLAY_COUNT && (
                      <span className="px-2 py-1 text-gray-500 text-xs">
                        외 {result.suspiciousDetails.length - MAX_DISPLAY_COUNT}건
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Stale symbols */}
              {result.staleDetails.length > 0 && (
                <div>
                  <div className="text-xs text-amber-400 mb-2 font-medium">
                    오래됨 ({result.staleDetails.length}건) - 어제 이전 데이터
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {staleToShow.map((detail) => (
                      <span
                        key={detail.symbol}
                        className="px-2 py-1 bg-amber-50 text-amber-300 text-xs rounded border border-amber-800/50"
                        title={`마지막 업데이트: ${formatDateTime(detail.updatedAt)}`}
                      >
                        {detail.symbol} ({detail.daysBehind}일 전)
                      </span>
                    ))}
                    {!isExpanded && result.staleDetails.length > MAX_DISPLAY_COUNT && (
                      <span className="px-2 py-1 text-gray-500 text-xs">
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
  );
}

// ==================== System Status Footer ====================

function SystemStatusFooter({ dbConnected, health }: {
  dbConnected: boolean;
  health: {
    db: { connected: boolean; type: string | null };
    scheduler: {
      isRunning: boolean;
      cronExpression: string;
      timezone: string;
      nextExecution: string | null;
    };
    targetFiles: Array<{ reportType: ReportType; filename: string }>;
  } | undefined;
}) {
  return (
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
  );
}

// ==================== Main Page ====================

export default function ReportMonitoringPage() {
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useReportMonitoringHealth();

  const dbConnected = health?.db.connected ?? false;

  const {
    data: monitoringResult,
    isLoading: resultLoading,
    error: resultError,
  } = useReportMonitoringResult(dbConnected);

  const {
    data: monitoringHistory,
  } = useReportMonitoringHistory(dbConnected);

  const runCheckMutation = useRunReportCheck();

  const isLoading = healthLoading || (dbConnected && resultLoading);
  const error = healthError || resultError;
  const summary = monitoringResult?.summary;
  const checking = runCheckMutation.isPending;

  const handleRunCheck = () => {
    runCheckMutation.mutate();
  };

  return (
    <Dashboard
      isLoading={isLoading}
      error={error as Error | null}
      refetch={refetchHealth}
    >
      <Dashboard.Header
        title="리포트 모니터링"
        rightContent={
          <div className="text-gray-500 text-sm">
            {health && !isLoading && `마지막 갱신: ${new Date().toLocaleTimeString('ko-KR')}`}
          </div>
        }
      />

      <Dashboard.Skeleton layout="kpi-only" />
      <Dashboard.Error />

      <Dashboard.Content>
        {/* Action Button */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={handleRunCheck}
            disabled={checking || !dbConnected}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              checking || !dbConnected
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-gray-900 hover:bg-blue-700'
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
          {runCheckMutation.error && (
            <span className="text-rose-400 text-sm">
              {runCheckMutation.error instanceof Error
                ? runCheckMutation.error.message
                : 'Check failed'}
            </span>
          )}
        </div>

        {/* KPI + 결과 테이블: monitoringResult 있을 때만 */}
        {monitoringResult ? (
          <>
            {/* KPI Cards */}
            <Dashboard.KPISection columns={3} className="lg:!grid-cols-6">
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
                title="누락"
                value={summary?.totalMissing ?? 0}
                format="number"
                icon={<AlertTriangle className="w-5 h-5" />}
                status={(summary?.totalMissing ?? 0) > 0 ? 'error' : 'success'}
              />
              <KPICard
                title="불완전"
                value={summary?.totalIncomplete ?? 0}
                format="number"
                icon={<AlertCircle className="w-5 h-5" />}
                status={(summary?.totalIncomplete ?? 0) > 0 ? 'error' : 'success'}
              />
              <KPICard
                title="확인필요"
                value={summary?.totalSuspicious ?? 0}
                format="number"
                icon={<HelpCircle className="w-5 h-5" />}
                status={(summary?.totalSuspicious ?? 0) > 0 ? 'warning' : 'success'}
              />
              <KPICard
                title="오래됨"
                value={summary?.totalStale ?? 0}
                format="number"
                icon={<Clock className="w-5 h-5" />}
                status={(summary?.totalStale ?? 0) > 0 ? 'warning' : 'success'}
              />
            </Dashboard.KPISection>

            {/* Report Status Table */}
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

            {/* Issue Detail Accordion */}
            <IssueDetailSection results={monitoringResult.results} />
          </>
        ) : (
          /* 실시간 결과 없을 때: 이력 유무에 따라 다르게 표시 */
          <div className={`bg-white border border-gray-200 rounded-xl mb-8 ${
            monitoringHistory?.items?.length ? 'p-4' : 'p-12'
          }`}>
            {monitoringHistory?.items?.length ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      서버 재시작으로 실시간 결과가 초기화되었습니다
                    </p>
                    <p className="text-xs text-gray-400">
                      아래 이력에서 이전 체크 결과를 확인하거나, 새로 체크를 실행하세요
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRunCheck}
                  disabled={checking || !dbConnected}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {checking ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {checking ? '실행 중...' : '체크 실행'}
                </button>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* 이력: 항상 표시 */}
        {monitoringHistory?.items && monitoringHistory.items.length > 0 && (
          <div className="bg-white border border-gray-200 p-6 rounded-xl mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              데이터 체크 이력
            </h3>
            <DataTable
              data={monitoringHistory.items}
              columns={[
                {
                  key: 'trigger',
                  header: '트리거',
                  render: (value) => (
                    <StatusBadge
                      variant={String(value) === 'manual' ? 'warning' : 'success'}
                      label={String(value) === 'manual' ? '수동' : '스케줄'}
                    />
                  ),
                },
                {
                  key: 'totalReports',
                  header: '리포트',
                  align: 'right' as const,
                  render: (value) => <span className="text-gray-600">{String(value)}</span>,
                },
                {
                  key: 'healthyReports',
                  header: '정상',
                  align: 'right' as const,
                  render: (value) => <span className="text-emerald-400">{String(value)}</span>,
                },
                {
                  key: 'hasIssues',
                  header: '이슈',
                  align: 'right' as const,
                  render: (value, row) => {
                    const item = row as MonitoringHistoryItem;
                    return item.hasIssues ? (
                      <span className="text-rose-400 font-medium">{item.issueReports}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    );
                  },
                },
                {
                  key: 'totalMissing',
                  header: '누락',
                  align: 'right' as const,
                  render: (value) => {
                    const n = Number(value);
                    return <span className={n > 0 ? 'text-rose-400' : 'text-gray-400'}>{n}</span>;
                  },
                },
                {
                  key: 'checkedAt',
                  header: '실행시간',
                  align: 'right' as const,
                  render: (value) => (
                    <span className="text-gray-500">{formatDateTime(String(value))}</span>
                  ),
                },
              ] as Column<MonitoringHistoryItem>[]}
              variant="card"
              rowKey="id"
            >
              <DataTable.Content>
                <DataTable.Header />
                <DataTable.Body emptyMessage="체크 이력이 없습니다" />
              </DataTable.Content>
              <DataTable.Pagination pageSize={5} />
            </DataTable>
          </div>
        )}

        {/* System Status Footer */}
        <SystemStatusFooter dbConnected={dbConnected} health={health} />
      </Dashboard.Content>
    </Dashboard>
  );
}
