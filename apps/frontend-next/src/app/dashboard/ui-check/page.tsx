'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Play,
  AlertCircle,
  HelpCircle,
  Monitor,
  XCircle,
  LayoutList,
  Shield,
  Save,
  Pencil,
  Eye,
  EyeOff,
  X,
  Loader2,
} from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dashboard } from '@/components/compound/Dashboard';
import { DataTable, Column } from '@/components/compound/DataTable';
import {
  useUiCheckResult,
  useUiCheckHistory,
  useUiCheckHistoryDetail,
  useRunUiCheck,
  useUiCheckHealth,
  useUiCheckConfig,
  useUpdateUiCheckConfig,
} from '@/hooks/queries/use-report-monitoring';
import type {
  UiPageCheckResult,
  SingleCheckResult,
  UiCheckHistoryItem,
} from '@ola/shared-types';
import type { UiCheckConfigTarget, UiCheckConfigCheck } from '@/services/reportMonitoringService';

// ==================== Constants ====================

const UI_STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  healthy: { label: '정상', variant: 'success' },
  degraded: { label: '경고', variant: 'warning' },
  broken: { label: '장애', variant: 'error' },
};

// ==================== Helpers ====================

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ==================== DataTable Column Definitions ====================

const uiCheckColumns: Column<UiPageCheckResult>[] = [
  {
    key: 'targetName',
    header: '리포트',
    render: (value) => (
      <span className="text-gray-900 font-medium">{String(value)}</span>
    ),
  },
  {
    key: 'status',
    header: '상태',
    render: (value) => {
      const statusKey = String(value);
      const statusInfo = UI_STATUS_LABELS[statusKey] || { label: statusKey, variant: 'success' as const };
      return <StatusBadge variant={statusInfo.variant} label={statusInfo.label} />;
    },
  },
  {
    key: 'passedCount',
    header: '✅ 통과',
    align: 'right',
    render: (value) => <span className="text-emerald-400">{String(value)}</span>,
  },
  {
    key: 'failedCount',
    header: '❌ 실패',
    align: 'right',
    render: (value) => {
      const count = Number(value);
      return (
        <span className={count > 0 ? 'text-rose-400 font-medium' : 'text-gray-400'}>
          {String(value)}
        </span>
      );
    },
  },
  {
    key: 'pageLoadTimeMs',
    header: '로딩시간',
    align: 'right',
    render: (value) => (
      <span className="text-gray-600">
        {(Number(value) / 1000).toFixed(1)}s
      </span>
    ),
  },
  {
    key: 'checks',
    header: '콘텐츠',
    align: 'right',
    render: (value) => {
      const checks = value as SingleCheckResult[];
      const contentChecks = checks.filter(c => c.category === 'content' || c.category === 'structure');
      if (contentChecks.length === 0) return <span className="text-gray-400">-</span>;
      const passed = contentChecks.filter(c => c.status === 'pass').length;
      const rate = Math.round((passed / contentChecks.length) * 100);
      return (
        <span className={rate === 100 ? 'text-emerald-400' : rate >= 70 ? 'text-amber-400' : 'text-rose-400'}>
          {rate}%
        </span>
      );
    },
  },
  {
    key: 'checkedAt',
    header: '체크시간',
    align: 'right',
    render: (value) => (
      <span className="text-gray-500">{formatDateTime(String(value))}</span>
    ),
  },
];

// ==================== UI Issue Detail Section ====================

interface UiIssueDetailSectionProps {
  results: UiPageCheckResult[];
  title?: string;
}

function UiIssueDetailSection({ results, title }: UiIssueDetailSectionProps) {
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const [showAllResults, setShowAllResults] = useState(false);

  const toggleExpand = (targetId: string) => {
    setExpandedTargets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }
      return newSet;
    });
  };

  const resultsWithIssues = results.filter((r) => r.status !== 'healthy');
  const displayResults = showAllResults ? results : resultsWithIssues;

  if (!showAllResults && resultsWithIssues.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          {title || 'UI 이슈 상세'}
        </h3>
        <button
          onClick={() => setShowAllResults((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
            bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
        >
          {showAllResults ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              이슈만 보기
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              모든 결과 보기
            </>
          )}
        </button>
      </div>
      {displayResults.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">표시할 결과가 없습니다</p>
      ) : (
      <div className="space-y-4">
        {displayResults.map((result) => {
          const isExpanded = expandedTargets.has(result.targetId);

          const isHealthy = result.status === 'healthy';
          return (
            <div
              key={result.targetId}
              className={`border rounded-lg p-4 ${
                isHealthy
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-medium">{result.targetName}</span>
                  <StatusBadge
                    variant={UI_STATUS_LABELS[result.status]?.variant || 'success'}
                    label={UI_STATUS_LABELS[result.status]?.label || result.status}
                  />
                </div>
                {result.checks.length > 3 && (
                  <button
                    onClick={() => toggleExpand(result.targetId)}
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

              {/* Check results — category별 그룹핑 */}
              <div className="space-y-3">
                {(() => {
                  const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
                    structure: { label: '구조', icon: <LayoutList className="w-3.5 h-3.5" />, color: 'text-blue-500', bg: 'bg-blue-50' },
                    content: { label: '콘텐츠', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-orange-500', bg: 'bg-orange-50' },
                    rendering: { label: '렌더링', icon: <Monitor className="w-3.5 h-3.5" />, color: 'text-slate-500', bg: 'bg-slate-50' },
                    error: { label: '에러', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-rose-500', bg: 'bg-rose-50' },
                  };

                  const grouped: Record<string, SingleCheckResult[]> = {};
                  for (const check of result.checks) {
                    const cat = check.category || 'uncategorized';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(check);
                  }

                  const categories = ['structure', 'content', 'rendering', 'error', 'uncategorized'];

                  return categories
                    .filter(cat => grouped[cat]?.length > 0)
                    .map(cat => {
                      const checks = grouped[cat];
                      const config = categoryConfig[cat] || { label: '기타', icon: <HelpCircle className="w-3.5 h-3.5" />, color: 'text-gray-500', bg: 'bg-gray-50' };
                      const failedCount = checks.filter(c => c.status !== 'pass').length;
                      const checksToShow = isExpanded ? checks : checks.slice(0, 5);

                      return (
                        <div key={cat}>
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${config.color} mb-1.5`}>
                            {config.icon}
                            {config.label} ({checks.length}건{failedCount > 0 ? `, ${failedCount} 실패` : ''})
                          </div>
                          <div className="space-y-1.5 ml-5">
                            {checksToShow.map((check, idx) => {
                              const isPass = check.status === 'pass';
                              const isFail = !isPass;
                              return (
                                <div key={idx}>
                                  <div
                                    className={`flex items-start gap-2 text-sm ${
                                      isPass ? 'text-gray-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {isPass ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">{check.description}</span>
                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded font-mono">
                                          {check.type}
                                        </span>
                                        {check.durationMs > 0 && (
                                          <span className="text-[10px] text-gray-400">
                                            {check.durationMs}ms
                                          </span>
                                        )}
                                      </div>
                                      {check.message && (
                                        <div className="text-xs text-gray-500 mt-0.5">{check.message}</div>
                                      )}
                                    </div>
                                  </div>
                                  {/* 실패 디버깅 정보 */}
                                  {isFail && (
                                    <div className="ml-5.5 mt-1 mb-1 p-2 bg-rose-50 border border-rose-100 rounded text-xs space-y-1">
                                      {check.selector && (
                                        <div className="flex gap-2">
                                          <span className="text-gray-500 shrink-0">selector:</span>
                                          <code className="text-rose-700 font-mono bg-white px-1 rounded break-all">{check.selector}</code>
                                        </div>
                                      )}
                                      {check.expected && (
                                        <div className="flex gap-2">
                                          <span className="text-gray-500 shrink-0">expected:</span>
                                          <span className="text-emerald-700">{check.expected}</span>
                                        </div>
                                      )}
                                      {check.actual && (
                                        <div className="flex gap-2">
                                          <span className="text-gray-500 shrink-0">actual:</span>
                                          <span className="text-rose-700">{check.actual}</span>
                                        </div>
                                      )}
                                      {check.details && Object.keys(check.details).length > 0 && (
                                        <div className="mt-1 pt-1 border-t border-rose-100">
                                          <pre className="text-gray-600 font-mono whitespace-pre-wrap break-all">
                                            {JSON.stringify(check.details, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {!isExpanded && checks.length > 5 && (
                              <div className="text-xs text-gray-400">
                                외 {checks.length - 5}건...
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>

              {/* Console errors */}
              {result.consoleErrors && result.consoleErrors.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-2 font-medium">
                    Console Errors ({result.consoleErrors.length})
                  </div>
                  <div className="bg-gray-900 text-red-400 p-3 rounded-lg text-xs font-mono max-h-32 overflow-y-auto">
                    {result.consoleErrors.map((err, i) => (
                      <div key={i} className="mb-1">
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ==================== UI Check History Section ====================

interface UiCheckHistorySectionProps {
  history: UiCheckHistoryItem[] | undefined;
}

function UiCheckHistorySection({ history }: UiCheckHistorySectionProps) {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const { data: historyDetail, isLoading: detailLoading } = useUiCheckHistoryDetail(selectedHistoryId);

  if (!history || history.length === 0) return null;

  const historyColumns: Column<UiCheckHistoryItem>[] = [
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
      key: 'totalTargets',
      header: '타겟',
      align: 'right',
      render: (value) => <span className="text-gray-600">{String(value)}</span>,
    },
    {
      key: 'healthyTargets',
      header: '정상',
      align: 'right',
      render: (value) => <span className="text-emerald-400">{String(value)}</span>,
    },
    {
      key: 'hasIssues',
      header: '이슈',
      align: 'right',
      render: (value, row) => {
        const hasIssues = Boolean(value);
        const issueCount = (row as UiCheckHistoryItem).degradedTargets + (row as UiCheckHistoryItem).brokenTargets;
        return hasIssues ? (
          <span className="text-rose-400 font-medium">{issueCount}</span>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
    },
    {
      key: 'totalDurationMs',
      header: '소요시간',
      align: 'right',
      render: (value) => (
        <span className="text-gray-600">
          {(Number(value) / 1000).toFixed(1)}s
        </span>
      ),
    },
    {
      key: 'checkedAt',
      header: '실행시간',
      align: 'right',
      render: (value) => (
        <span className="text-gray-500">{formatDateTime(String(value))}</span>
      ),
    },
  ];

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-400" />
        UI 체크 이력
        <span className="text-xs text-gray-400 font-normal">행을 클릭하면 상세 결과를 볼 수 있습니다</span>
      </h3>
      <DataTable
        data={history}
        columns={historyColumns}
        variant="card"
        rowKey="id"
      >
        <DataTable.Content>
          <DataTable.Header />
          <DataTable.Body
            emptyMessage="체크 이력이 없습니다"
            onRowClick={(row) => {
              const item = row as UiCheckHistoryItem;
              setSelectedHistoryId(prev => prev === item.id ? null : item.id);
            }}
            rowClassName={(row) => {
              const item = row as UiCheckHistoryItem;
              return item.id === selectedHistoryId
                ? 'ring-2 ring-blue-400 bg-blue-50/50 cursor-pointer'
                : 'cursor-pointer hover:bg-gray-50';
            }}
          />
        </DataTable.Content>
        <DataTable.Pagination pageSize={5} />
      </DataTable>

      {/* History Detail Panel */}
      {selectedHistoryId && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              이력 상세 결과
            </h4>
            <button
              onClick={() => setSelectedHistoryId(null)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              닫기
            </button>
          </div>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              상세 결과 로딩 중...
            </div>
          ) : historyDetail ? (
            <div className="space-y-3">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                  {historyDetail.summary.totalTargets}개 타겟
                </span>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded">
                  정상 {historyDetail.summary.healthyTargets}
                </span>
                {historyDetail.summary.degradedTargets > 0 && (
                  <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded">
                    경고 {historyDetail.summary.degradedTargets}
                  </span>
                )}
                {historyDetail.summary.brokenTargets > 0 && (
                  <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded">
                    장애 {historyDetail.summary.brokenTargets}
                  </span>
                )}
                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded">
                  {historyDetail.summary.passedChecks}/{historyDetail.summary.totalChecks} 통과
                </span>
                <span className={`px-2 py-1 rounded ${historyDetail.authSucceeded ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  인증 {historyDetail.authSucceeded ? '성공' : '실패'}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded">
                  {(historyDetail.totalDurationMs / 1000).toFixed(1)}s
                </span>
              </div>
              {/* Reuse existing detail component */}
              <UiIssueDetailSection results={historyDetail.results} title="이력 체크 결과" />
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">상세 결과를 불러올 수 없습니다</p>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== Check Config Section ====================

const CHECK_TYPE_COLORS: Record<string, string> = {
  no_empty_page: 'bg-blue-100 text-blue-700',
  no_error_text: 'bg-rose-100 text-rose-700',
  no_console_errors: 'bg-rose-100 text-rose-700',
  chart_rendered: 'bg-violet-100 text-violet-700',
  section_exists: 'bg-cyan-100 text-cyan-700',
  element_count_min: 'bg-amber-100 text-amber-700',
  content_not_empty: 'bg-emerald-100 text-emerald-700',
  element_exists: 'bg-gray-100 text-gray-700',
  table_structure: 'bg-indigo-100 text-indigo-700',
  no_empty_cells: 'bg-orange-100 text-orange-700',
};

// 편집 가능한 숫자 필드 컴포넌트
function EditableNumber({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400">{label}: </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
        min={0}
      />
    </div>
  );
}

function CheckConfigSection({ targets, onSave }: {
  targets: UiCheckConfigTarget[];
  onSave: (targetId: string, checkIndex: number, values: Record<string, unknown>) => void;
}) {
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  // 수정된 값 추적: key = `${targetId}-${checkIndex}-${field}`
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const toggleExpand = (targetId: string) => {
    setExpandedTargets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }
      return newSet;
    });
  };

  const getEditKey = (targetId: string, idx: number, field: string) =>
    `${targetId}-${idx}-${field}`;

  const getValue = (targetId: string, idx: number, field: string, original: number) => {
    const key = getEditKey(targetId, idx, field);
    return key in editedValues ? editedValues[key] : original;
  };

  const handleChange = (targetId: string, idx: number, field: string, value: number) => {
    const key = getEditKey(targetId, idx, field);
    setEditedValues(prev => ({ ...prev, [key]: value }));
    // 저장 표시 리셋
    setSavedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(`${targetId}-${idx}`);
      return newSet;
    });
  };

  const hasChanges = (targetId: string, idx: number, check: UiCheckConfigCheck) => {
    const fields = ['minCount', 'minContentLength', 'minItems'] as const;
    return fields.some(f => {
      const original = check[f];
      if (original == null) return false;
      const key = getEditKey(targetId, idx, f);
      return key in editedValues && editedValues[key] !== original;
    });
  };

  const handleSave = (targetId: string, idx: number, check: UiCheckConfigCheck) => {
    const values: Record<string, unknown> = {};
    const fields = ['minCount', 'minContentLength', 'minItems'] as const;
    for (const f of fields) {
      const key = getEditKey(targetId, idx, f);
      if (key in editedValues && editedValues[key] !== check[f]) {
        values[f] = editedValues[key];
      }
    }
    if (Object.keys(values).length > 0) {
      onSave(targetId, idx, values);
      setSavedKeys(prev => new Set(prev).add(`${targetId}-${idx}`));
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <LayoutList className="w-5 h-5 text-blue-500" />
        체크 설정 템플릿
        <span className="text-xs text-gray-400 font-normal">({targets.length}개 타겟)</span>
      </h3>
      <p className="text-xs text-gray-400 mb-4">수치 값은 직접 수정 가능합니다. 변경 후 저장 버튼을 눌러주세요.</p>
      <div className="space-y-3">
        {targets.map((target) => {
          const isExpanded = expandedTargets.has(target.id);
          return (
            <div key={target.id} className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <button
                onClick={() => toggleExpand(target.id)}
                className="w-full flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-900 font-medium">{target.name}</span>
                  {target.theme && (
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded font-mono">
                      {target.theme}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{target.checksCount}개 체크</span>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                  {/* URL */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 shrink-0">URL:</span>
                    <code className="text-gray-700 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 break-all">
                      {target.urlTemplate}
                    </code>
                  </div>

                  {/* Checks */}
                  <div className="space-y-2">
                    {target.checks.map((check, idx) => {
                      const changed = hasChanges(target.id, idx, check);
                      const saved = savedKeys.has(`${target.id}-${idx}`);
                      const hasEditableFields = check.minCount != null || check.minContentLength != null || check.minItems != null;

                      return (
                        <div key={idx} className={`bg-white border rounded p-2.5 text-xs ${changed ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-100'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${CHECK_TYPE_COLORS[check.type] || 'bg-gray-100 text-gray-600'}`}>
                                {check.type}
                              </span>
                              <span className="text-gray-700">{check.description}</span>
                            </div>
                            {hasEditableFields && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {saved && !changed && (
                                  <span className="text-emerald-500 text-[10px] flex items-center gap-0.5">
                                    <CheckCircle className="w-3 h-3" /> 저장됨
                                  </span>
                                )}
                                {changed && (
                                  <button
                                    onClick={() => handleSave(target.id, idx, check)}
                                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700 transition-colors"
                                  >
                                    <Save className="w-3 h-3" />
                                    저장
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 ml-0.5 text-gray-500">
                            {check.selector && (
                              <div>
                                <span className="text-gray-400">selector: </span>
                                <code className="font-mono text-gray-600">{check.selector}</code>
                              </div>
                            )}
                            {check.minCount != null && (
                              <EditableNumber
                                label="minCount"
                                value={getValue(target.id, idx, 'minCount', check.minCount)}
                                onChange={(v) => handleChange(target.id, idx, 'minCount', v)}
                              />
                            )}
                            {check.minContentLength != null && (
                              <EditableNumber
                                label="minLength"
                                value={getValue(target.id, idx, 'minContentLength', check.minContentLength)}
                                onChange={(v) => handleChange(target.id, idx, 'minContentLength', v)}
                              />
                            )}
                            {check.minItems != null && (
                              <EditableNumber
                                label="minItems"
                                value={getValue(target.id, idx, 'minItems', check.minItems)}
                                onChange={(v) => handleChange(target.id, idx, 'minItems', v)}
                              />
                            )}
                            {check.patterns && check.patterns.length > 0 && (
                              <div>
                                <span className="text-gray-400">patterns: </span>
                                <span className="text-gray-600">[{check.patterns.map(p => `"${p}"`).join(', ')}]</span>
                              </div>
                            )}
                            {check.sections && (
                              <div className="w-full mt-1">
                                <span className="text-gray-400">sections: </span>
                                <span className="text-gray-600">
                                  {check.sections.map(s => s.name).join(' / ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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

function SystemStatusFooter({ uiHealth }: {
  uiHealth?: {
    scheduler: {
      isRunning: boolean;
      cronExpression: string;
      timezone: string;
      nextExecution: string | null;
    };
  };
}) {
  return (
    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Monitor className="w-5 h-5" />
        UI 모니터링 시스템 상태
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* UI Scheduler */}
        <div className="space-y-2">
          <div className="text-sm text-gray-500">UI 스케줄러</div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                uiHealth?.scheduler?.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span
              className={uiHealth?.scheduler?.isRunning ? 'text-emerald-400' : 'text-gray-500'}
            >
              {uiHealth?.scheduler?.isRunning ? '실행 중' : '중지됨'}
            </span>
          </div>
          {uiHealth?.scheduler && (
            <div className="text-xs text-gray-400 space-y-1">
              <div>Cron: {uiHealth.scheduler.cronExpression}</div>
              <div>Timezone: {uiHealth.scheduler.timezone}</div>
              {uiHealth.scheduler.nextExecution && (
                <div>다음 실행: {formatDateTime(uiHealth.scheduler.nextExecution)}</div>
              )}
            </div>
          )}
        </div>

        {/* Auth Status */}
        <div className="space-y-2">
          <div className="text-sm text-gray-500">인증 상태</div>
          <div className="text-sm text-gray-600">
            Playwright 브라우저 자동 로그인
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Page ====================

export default function UiCheckPage() {
  const {
    data: uiCheckResult,
    isLoading,
    error,
    refetch,
  } = useUiCheckResult();

  const {
    data: uiCheckHistory,
  } = useUiCheckHistory();

  const {
    data: uiHealth,
  } = useUiCheckHealth();

  const {
    data: uiCheckConfig,
  } = useUiCheckConfig();

  const runUiCheckMutation = useRunUiCheck();
  const updateConfigMutation = useUpdateUiCheckConfig();

  const uiSummary = uiCheckResult?.summary;
  const uiChecking = runUiCheckMutation.isPending;

  const handleRunUiCheck = () => {
    runUiCheckMutation.mutate();
  };

  const handleSaveConfig = useCallback((targetId: string, checkIndex: number, values: Record<string, unknown>) => {
    updateConfigMutation.mutate({ targetId, checkIndex, values });
  }, [updateConfigMutation]);

  return (
    <Dashboard
      isLoading={isLoading}
      error={error as Error | null}
      refetch={refetch}
    >
      <Dashboard.Header
        title="UI 모니터링"
        rightContent={
          <div className="flex items-center gap-4">
            <button
              onClick={handleRunUiCheck}
              disabled={uiChecking}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                uiChecking
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uiChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  체크 실행 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  즉시 UI 체크 실행
                </>
              )}
            </button>
            {uiCheckResult?.authSucceeded !== undefined && (
              <StatusBadge
                variant={uiCheckResult.authSucceeded ? 'success' : 'error'}
                label={uiCheckResult.authSucceeded ? '인증 성공' : '인증 실패'}
              />
            )}
            {runUiCheckMutation.error && (
              <span className="text-rose-400 text-sm">
                {runUiCheckMutation.error instanceof Error
                  ? runUiCheckMutation.error.message
                  : 'UI Check failed'}
              </span>
            )}
          </div>
        }
      />

      <Dashboard.Skeleton layout="kpi-only" />
      <Dashboard.Error />

      <Dashboard.Content>
        {/* KPI + 결과 테이블: uiCheckResult 있을 때만 */}
        {uiCheckResult ? (
          <>
            {/* KPI Cards */}
            <Dashboard.KPISection columns={3} className="lg:!grid-cols-5">
              <KPICard
                title="전체 타겟"
                value={uiSummary?.totalTargets ?? 0}
                format="number"
                icon={<Monitor className="w-5 h-5" />}
                status="neutral"
              />
              <KPICard
                title="정상"
                value={uiSummary?.healthyTargets ?? 0}
                format="number"
                icon={<CheckCircle className="w-5 h-5" />}
                status={
                  uiSummary?.healthyTargets === uiSummary?.totalTargets
                    ? 'success'
                    : 'warning'
                }
              />
              <KPICard
                title="경고"
                value={uiSummary?.degradedTargets ?? 0}
                format="number"
                icon={<AlertTriangle className="w-5 h-5" />}
                status={(uiSummary?.degradedTargets ?? 0) > 0 ? 'warning' : 'success'}
              />
              <KPICard
                title="장애"
                value={uiSummary?.brokenTargets ?? 0}
                format="number"
                icon={<XCircle className="w-5 h-5" />}
                status={(uiSummary?.brokenTargets ?? 0) > 0 ? 'error' : 'success'}
              />
              <KPICard
                title="콘텐츠 완전성"
                value={(() => {
                  const contentChecks = uiCheckResult?.results.flatMap(r =>
                    r.checks.filter(c => c.category === 'content' || c.category === 'structure')
                  ) ?? [];
                  return contentChecks.length > 0
                    ? Math.round((contentChecks.filter(c => c.status === 'pass').length / contentChecks.length) * 100)
                    : 100;
                })()}
                format="percentage"
                icon={<Shield className="w-5 h-5" />}
                status={(() => {
                  const contentChecks = uiCheckResult?.results.flatMap(r =>
                    r.checks.filter(c => c.category === 'content' || c.category === 'structure')
                  ) ?? [];
                  const rate = contentChecks.length > 0
                    ? (contentChecks.filter(c => c.status === 'pass').length / contentChecks.length)
                    : 1;
                  return rate >= 0.9 ? 'success' : rate >= 0.7 ? 'warning' : 'error';
                })()}
              />
            </Dashboard.KPISection>

            {/* UI Check Results Table */}
            <Dashboard.TableSection title="타겟별 UI 상태" className="mb-8">
              <DataTable
                data={uiCheckResult.results}
                columns={uiCheckColumns}
                variant="card"
                rowKey="targetId"
              >
                <DataTable.Content>
                  <DataTable.Header />
                  <DataTable.Body
                    emptyMessage="UI 체크 결과가 없습니다"
                    rowClassName={(row) => {
                      const status = (row as UiPageCheckResult).status;
                      if (status === 'broken') return 'bg-rose-50 hover:bg-rose-50';
                      if (status === 'degraded') return 'bg-amber-50 hover:bg-amber-50';
                      return '';
                    }}
                  />
                </DataTable.Content>
              </DataTable>
            </Dashboard.TableSection>

            {/* UI Issue Detail Accordion */}
            <UiIssueDetailSection results={uiCheckResult.results} />
          </>
        ) : (
          /* 실시간 결과 없을 때: 실행 안내 배너 (이력이 있으면 간소화) */
          <div className={`bg-white border border-gray-200 rounded-xl mb-8 ${
            uiCheckHistory?.items?.length ? 'p-4' : 'p-12'
          }`}>
            {uiCheckHistory?.items?.length ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-gray-400" />
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
                  onClick={handleRunUiCheck}
                  disabled={uiChecking}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uiChecking ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {uiChecking ? '실행 중...' : 'UI 체크 실행'}
                </button>
              </div>
            ) : (
              <EmptyState
                variant="solid"
                icon={<Monitor className="w-16 h-16 text-gray-400" />}
                title="아직 UI 체크가 실행되지 않았습니다"
                description="리포트 페이지 UI 상태를 확인하려면 체크를 실행하세요."
                action={{
                  label: '첫 UI 체크 실행',
                  onClick: handleRunUiCheck,
                  icon: <Play className="w-4 h-4" />,
                  disabled: uiChecking,
                }}
              />
            )}
          </div>
        )}

        {/* 이력/설정/시스템상태: 항상 표시 */}
        <UiCheckHistorySection history={uiCheckHistory?.items} />

        {/* Check Config Template */}
        {uiCheckConfig?.targets && (
          <CheckConfigSection targets={uiCheckConfig.targets} onSave={handleSaveConfig} />
        )}

        {/* System Status Footer */}
        <SystemStatusFooter uiHealth={uiHealth} />
      </Dashboard.Content>
    </Dashboard>
  );
}
