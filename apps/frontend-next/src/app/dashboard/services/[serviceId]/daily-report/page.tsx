'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FileText, Plus, Loader2, CheckCircle, XCircle, AlertTriangle, Clock, SkipForward } from 'lucide-react';
import { useServiceContext } from '@/hooks/useServiceContext';
import {
  useIbkChatReports,
  useGenerateIbkChatReport,
} from '@/hooks/queries/use-ibk-chat-report';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMPLETED: { label: '완료', color: 'bg-emerald-500/20 text-emerald-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  RUNNING: { label: '생성 중', color: 'bg-blue-500/20 text-blue-400', icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  FAILED: { label: '실패', color: 'bg-rose-500/20 text-rose-400', icon: <XCircle className="w-3.5 h-3.5" /> },
  SKIPPED: { label: '건너뜀', color: 'bg-gray-500/20 text-gray-400', icon: <SkipForward className="w-3.5 h-3.5" /> },
  PENDING: { label: '대기', color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="w-3.5 h-3.5" /> },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}초`;
}

function formatTargetDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

export default function DailyReportListPage() {
  const ctx = useServiceContext();
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.serviceId as string;

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [generateDate, setGenerateDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });

  const { data, isLoading, error, refetch } = useIbkChatReports({
    status: statusFilter || undefined,
    limit: 50,
  });

  const generateMutation = useGenerateIbkChatReport();

  if (!ctx) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-gray-50">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
          <p className="text-rose-600">서비스 컨텍스트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync({ targetDate: generateDate, force: true });
    } catch { /* handled by mutation state */ }
  };

  const handleRowClick = (targetDate: string) => {
    const date = formatTargetDate(targetDate);
    router.push(`/dashboard/services/${serviceId}/daily-report/${date}`);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">IBK-CHAT 일일 리포트</h1>
              <p className="text-sm text-gray-500">BigQuery 로그 기반 LLM 분석 리포트</p>
            </div>
          </div>
        </div>

        {/* Generate Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">수동 리포트 생성</h3>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">대상 날짜</label>
              <input
                type="date"
                value={generateDate}
                onChange={(e) => setGenerateDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              리포트 생성
            </button>
          </div>
          {generateMutation.isError && (
            <div className="mt-2 flex items-center gap-2 text-sm text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              {generateMutation.error?.message}
            </div>
          )}
          {generateMutation.isSuccess && (
            <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              리포트 생성이 시작되었습니다.
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">상태 필터:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">전체</option>
            <option value="COMPLETED">완료</option>
            <option value="FAILED">실패</option>
            <option value="SKIPPED">건너뜀</option>
            <option value="RUNNING">생성 중</option>
          </select>
          <button onClick={() => refetch()} className="text-sm text-blue-600 hover:text-blue-700">
            새로고침
          </button>
        </div>

        {/* Report List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl">
            <p className="text-rose-600">리포트 목록을 불러오지 못했습니다.</p>
          </div>
        ) : !data?.reports?.length ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">아직 생성된 리포트가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">위에서 날짜를 선택하고 리포트를 생성해 보세요.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">날짜</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">상태</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">총 건수</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">소요시간</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">생성일</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => {
                  const statusCfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.PENDING;
                  return (
                    <tr
                      key={report.id}
                      onClick={() => handleRowClick(report.targetDate)}
                      className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-gray-900">
                          {formatTargetDate(report.targetDate)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm text-gray-600">
                          {report.rowCount?.toLocaleString() ?? '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm text-gray-500">
                          {formatDuration(report.durationMs)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-xs text-gray-400">
                          {formatDate(report.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">총 {data.total}건</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
