'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, RefreshCw, AlertTriangle, SkipForward, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useServiceContext } from '@/hooks/useServiceContext';
import {
  useIbkChatReport,
  useGenerateIbkChatReport,
} from '@/hooks/queries/use-ibk-chat-report';
import { MarkdownViewer } from '@/components/markdown';

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMPLETED: { label: '완료', color: 'bg-emerald-500/20 text-emerald-400', icon: <CheckCircle className="w-4 h-4" /> },
  RUNNING: { label: '생성 중', color: 'bg-blue-500/20 text-blue-400', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  FAILED: { label: '실패', color: 'bg-rose-500/20 text-rose-400', icon: <XCircle className="w-4 h-4" /> },
  SKIPPED: { label: '건너뜀', color: 'bg-gray-500/20 text-gray-400', icon: <SkipForward className="w-4 h-4" /> },
  PENDING: { label: '대기', color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="w-4 h-4" /> },
};

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}초`;
}

export default function DailyReportDetailPage() {
  const ctx = useServiceContext();
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.serviceId as string;
  const date = params?.date as string;

  const { data: report, isLoading, error } = useIbkChatReport(date ?? null);
  const regenerateMutation = useGenerateIbkChatReport();

  const isRunning = report?.status === 'RUNNING';

  if (!ctx) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-gray-50">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
          <p className="text-rose-600">서비스 컨텍스트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const handleRegenerate = async () => {
    try {
      await regenerateMutation.mutateAsync({ targetDate: date, force: true });
    } catch {
      // error shown via mutation state
    }
  };

  const statusCfg = STATUS_DISPLAY[report?.status ?? 'PENDING'] ?? STATUS_DISPLAY.PENDING;

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back + Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard/services/${serviceId}/daily-report`)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="p-2 bg-blue-50 rounded-xl">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{date} 일일 리포트</h1>
              <p className="text-sm text-gray-500">IBK-CHAT 일일 분석 리포트</p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl">
            <p className="text-rose-600">리포트를 불러오지 못했습니다.</p>
          </div>
        )}

        {/* Report Content */}
        {report && (
          <>
            {/* Meta Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.color}`}>
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                </div>
                {(report.status === 'FAILED' || report.status === 'COMPLETED') && (
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerateMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {regenerateMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    재생성
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400">총 건수</p>
                  <p className="text-sm font-medium text-gray-700">{report.rowCount?.toLocaleString() ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">소요시간</p>
                  <p className="text-sm font-medium text-gray-700">{formatDuration(report.durationMs)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">생성일</p>
                  <p className="text-sm font-medium text-gray-700">
                    {report.createdAt ? new Date(report.createdAt).toLocaleString('ko-KR') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">완료일</p>
                  <p className="text-sm font-medium text-gray-700">
                    {report.completedAt ? new Date(report.completedAt).toLocaleString('ko-KR') : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* RUNNING State */}
            {isRunning && (
              <div className="bg-blue-50 border border-blue-200 p-8 rounded-xl text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-blue-700 font-medium">리포트를 생성하고 있습니다...</p>
                <p className="text-sm text-blue-500 mt-1">완료 후 자동으로 표시됩니다. 페이지를 새로고침해 주세요.</p>
              </div>
            )}

            {/* FAILED State */}
            {report.status === 'FAILED' && (
              <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <p className="text-rose-700 font-medium">리포트 생성에 실패했습니다.</p>
                </div>
                <p className="text-sm text-rose-600">{report.errorMessage}</p>
              </div>
            )}

            {/* SKIPPED State */}
            {report.status === 'SKIPPED' && (
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <SkipForward className="w-5 h-5 text-gray-500" />
                  <p className="text-gray-700 font-medium">해당 날짜 데이터가 부족합니다 (50건 미만).</p>
                </div>
                <p className="text-sm text-gray-500">{report.errorMessage}</p>
              </div>
            )}

            {/* COMPLETED - Markdown Report */}
            {report.status === 'COMPLETED' && report.reportMarkdown && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
                <MarkdownViewer content={report.reportMarkdown} size="base" enableCodeCopy />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
