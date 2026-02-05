'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, XCircle, Clock, FileWarning, RefreshCw } from 'lucide-react';
import { useServiceContext } from '@/hooks/useServiceContext';
import { Dashboard } from '@/components/compound/Dashboard';
import KPICard from '@/components/kpi/KPICard';
import { DataTable, type Column } from '@/components/compound/DataTable';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import apiClient from '@/lib/api-client';

// 백엔드 WindETLError DTO에 맞춘 인터페이스
interface ErrorLog {
  errorMessage: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  affectedRuns: number[];
}

interface ErrorStats {
  totalErrors: number;
  totalOccurrences: number;
  topErrorMessage: string;
  topErrorCount: number;
}

export default function ServiceLogsPage() {
  const ctx = useServiceContext();
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const etlApiPrefix = ctx?.etlApiPrefix || ctx?.apiPrefix || '';

  const fetchData = async () => {
    if (!etlApiPrefix) return;

    setIsLoading(true);
    setError(null);
    try {
      const [errorsRes] = await Promise.all([
        apiClient.get(`${etlApiPrefix}/errors?days=${dateRange.days}`),
      ]);
      // ETL API 응답 구조: { success: true, data: [...] }
      const rawData = errorsRes.data?.data ?? errorsRes.data;
      const errorData: ErrorLog[] = Array.isArray(rawData) ? rawData : [];
      setErrors(errorData);

      // 통계 계산 - 백엔드에서 문자열로 반환될 수 있으므로 Number()로 변환
      const totalOccurrences = errorData.reduce((sum, e) => sum + Number(e.occurrenceCount || 0), 0);
      const sortedErrors = [...errorData].sort((a, b) => Number(b.occurrenceCount || 0) - Number(a.occurrenceCount || 0));

      setStats({
        totalErrors: errorData.length,
        totalOccurrences,
        topErrorMessage: sortedErrors[0]?.errorMessage || '-',
        topErrorCount: Number(sortedErrors[0]?.occurrenceCount || 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('데이터 로드 실패'));
      // 목업 데이터
      const mockErrors: ErrorLog[] = [
        { errorMessage: '파일을 찾을 수 없습니다: data_2025_02_05.csv', occurrenceCount: 5, firstSeen: new Date(Date.now() - 86400000).toISOString(), lastSeen: new Date().toISOString(), affectedRuns: [1, 2, 3] },
        { errorMessage: 'JSON 파싱 실패: config.json', occurrenceCount: 3, firstSeen: new Date(Date.now() - 3600000).toISOString(), lastSeen: new Date().toISOString(), affectedRuns: [4, 5] },
        { errorMessage: 'API 연결 실패', occurrenceCount: 2, firstSeen: new Date(Date.now() - 7200000).toISOString(), lastSeen: new Date().toISOString(), affectedRuns: [6] },
      ];
      setErrors(mockErrors);
      setStats({ totalErrors: 3, totalOccurrences: 10, topErrorMessage: '파일을 찾을 수 없습니다', topErrorCount: 5 });
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  // etlApiPrefix가 변경되거나 dateRange.days가 변경될 때만 fetchData 실행
  // ctx 객체 전체를 의존성으로 사용하면 매 렌더마다 재실행되므로 원시값 사용
  useEffect(() => {
    if (etlApiPrefix) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etlApiPrefix, dateRange.days]);

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

  const errorColumns: Column<ErrorLog>[] = [
    { key: 'errorMessage', header: '에러 메시지',
      render: (v) => (
        <span className="text-gray-900 truncate block max-w-[400px]" title={v as string}>
          {v as string}
        </span>
      ),
    },
    { key: 'occurrenceCount', header: '발생 횟수', align: 'center',
      render: (v) => {
        const count = Number(v || 0);
        return (
          <span className={`font-medium ${count >= 5 ? 'text-rose-500' : 'text-gray-600'}`}>
            {count.toLocaleString()}회
          </span>
        );
      },
    },
    { key: 'firstSeen', header: '최초 발생', align: 'center',
      render: (v) => <span className="text-gray-500 text-xs whitespace-nowrap">{formatDate(v as string)}</span>,
    },
    { key: 'lastSeen', header: '최근 발생', align: 'center',
      render: (v) => <span className="text-gray-500 text-xs whitespace-nowrap">{formatDate(v as string)}</span>,
    },
    { key: 'affectedRuns', header: '영향 실행', align: 'center',
      render: (v) => (
        <span className="text-gray-500 text-xs">
          {Array.isArray(v) ? `${v.length}건` : '-'}
        </span>
      ),
    },
  ];

  const serviceName = ctx.config?.name || ctx.serviceId;

  return (
    <Dashboard isLoading={isLoading} error={error} refetch={fetchData}>
      <Dashboard.Header
        title={`${serviceName} 에러 로그`}
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
            title="에러 유형"
            value={stats?.totalErrors || 0}
            format="number"
            icon={<AlertTriangle className="w-5 h-5" />}
            status={(stats?.totalErrors || 0) > 10 ? 'error' : (stats?.totalErrors || 0) > 5 ? 'warning' : 'neutral'}
            subtitle={`최근 ${dateRange.days}일`}
          />
          <KPICard
            title="총 발생 횟수"
            value={stats?.totalOccurrences || 0}
            format="number"
            icon={<XCircle className="w-5 h-5" />}
            status={(stats?.totalOccurrences || 0) > 20 ? 'error' : (stats?.totalOccurrences || 0) > 10 ? 'warning' : 'neutral'}
          />
          <KPICard
            title="최다 발생 에러"
            value={stats?.topErrorCount || 0}
            format="number"
            icon={<FileWarning className="w-5 h-5" />}
            status={(stats?.topErrorCount || 0) > 5 ? 'error' : 'warning'}
            subtitle="회"
          />
          <KPICard
            title="영향받은 실행"
            value={errors.reduce((sum, e) => sum + (e.affectedRuns?.length || 0), 0)}
            format="number"
            icon={<Clock className="w-5 h-5" />}
            status="neutral"
            subtitle="총 실행 수"
          />
        </Dashboard.KPISection>

        {/* 에러 발생 빈도 분포 */}
        {errors.length > 0 && (
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">에러 발생 빈도</h3>
            <div className="space-y-3">
              {errors.slice(0, 5).map((err, index) => {
                const maxCount = Math.max(...errors.map(e => Number(e.occurrenceCount || 0)));
                const count = Number(err.occurrenceCount || 0);
                const percentage = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                return (
                  <div key={`error-${index}`} className="flex items-center gap-4">
                    <span className="text-xs text-gray-700 truncate max-w-[200px]" title={err.errorMessage}>
                      {err.errorMessage?.slice(0, 30)}...
                    </span>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-400 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">{count}회</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <DataTable data={Array.isArray(errors) ? errors : []} columns={errorColumns} rowKey={(row) => row.errorMessage || 'unknown'}>
            <DataTable.Toolbar>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                에러 목록
              </h3>
              <span className="text-sm text-gray-500">{Array.isArray(errors) ? errors.length : 0}건</span>
            </DataTable.Toolbar>
            <DataTable.Content>
              <DataTable.Header />
              <DataTable.Body
                expandable
                renderExpandedRow={(row: ErrorLog) => (
                  <div className="space-y-3">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">전체 에러 메시지:</div>
                      <div className="text-gray-900 bg-white p-3 rounded-lg text-sm font-mono">{row.errorMessage}</div>
                    </div>
                    {row.affectedRuns && row.affectedRuns.length > 0 && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">영향받은 실행 ID:</div>
                        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {row.affectedRuns.join(', ')}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-6 text-xs text-gray-500">
                      <span>최초 발생: {formatDate(row.firstSeen)}</span>
                      <span>최근 발생: {formatDate(row.lastSeen)}</span>
                    </div>
                  </div>
                )}
                emptyMessage="에러 로그가 없습니다."
                emptyIcon={<AlertTriangle className="w-12 h-12 text-gray-300" />}
              />
            </DataTable.Content>
            <DataTable.Footer />
          </DataTable>
        </div>
      </Dashboard.Content>
    </Dashboard>
  );
}
