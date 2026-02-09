'use client';

import { useState } from 'react';
import { Database, TrendingUp, Clock, HardDrive, RefreshCw } from 'lucide-react';
import { useServiceContext } from '@/hooks/useServiceContext';
import { Dashboard } from '@/components/compound/Dashboard';
import KPICard from '@/components/kpi/KPICard';
import { DataTable, type Column } from '@/components/compound/DataTable';
import { Chart } from '@/components/compound/Chart';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from '@/lib/recharts';

interface DailyLoadData {
  date: string;
  recordCount: number;
  dataSize?: number;
}

interface TableInfo {
  name: string;
  recordCount: number;
  lastUpdated: string;
  dataSize?: string;
}

export default function ServiceDataLoadingPage() {
  const ctx = useServiceContext();
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  const projectId = ctx?.projectId || '';

  const { data: dailyData = [], isLoading: dailyLoading } = useQuery({
    queryKey: ['data-loading-daily', projectId, dateRange.days],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/api/metrics/daily?days=${dateRange.days}`);
      return res.data || [];
    },
    enabled: !!projectId,
  });

  const { data: tableInfo = [], isLoading: tableLoading } = useQuery({
    queryKey: ['data-loading-tables', projectId],
    queryFn: async () => {
      // 임시 데이터 - 실제 API가 있으면 교체
      return [
        { name: 'chat_logs', recordCount: 125000, lastUpdated: new Date().toISOString(), dataSize: '2.5 GB' },
        { name: 'user_sessions', recordCount: 45000, lastUpdated: new Date().toISOString(), dataSize: '850 MB' },
        { name: 'analytics_events', recordCount: 380000, lastUpdated: new Date().toISOString(), dataSize: '5.2 GB' },
      ] as TableInfo[];
    },
    enabled: !!projectId,
  });

  const isLoading = dailyLoading || tableLoading;

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

  const tableColumns: Column<TableInfo>[] = [
    { key: 'name', header: '테이블명',
      render: (v) => (
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-900 font-mono">{v as string}</span>
        </div>
      ),
    },
    { key: 'recordCount', header: '레코드 수', align: 'center',
      render: (v) => <span className="text-gray-600">{(v as number).toLocaleString()}</span>,
    },
    { key: 'dataSize', header: '크기', align: 'center',
      render: (v) => <span className="text-gray-500">{v as string}</span>,
    },
    { key: 'lastUpdated', header: '마지막 업데이트', align: 'center',
      render: (v) => <span className="text-gray-500 text-xs">{formatDate(v as string)}</span>,
    },
  ];

  const todayRecords = dailyData.length > 0 ? dailyData[dailyData.length - 1]?.recordCount || 0 : 0;
  const totalRecords = tableInfo.reduce((sum, t) => sum + t.recordCount, 0);
  const latestUpdate = tableInfo.length > 0
    ? new Date(Math.max(...tableInfo.map(t => new Date(t.lastUpdated).getTime())))
    : null;

  const chartData = dailyData.map((d: DailyLoadData) => ({
    name: new Date(d.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    value: d.recordCount,
  }));

  return (
    <Dashboard isLoading={isLoading} error={null}>
      <Dashboard.Header
        title="데이터 적재 현황"
        rightContent={
          <DateRangeFilter
            defaultPreset="week"
            onChange={(range) => setDateRange(range)}
          />
        }
      />

      <Dashboard.Skeleton layout="kpi-chart" />

      <Dashboard.Content>
        <Dashboard.KPISection columns={4}>
          <KPICard
            title="오늘 적재량"
            value={todayRecords}
            format="number"
            icon={<TrendingUp className="w-5 h-5" />}
            status="neutral"
            subtitle="레코드 수"
          />
          <KPICard
            title="총 레코드"
            value={totalRecords}
            format="number"
            icon={<Database className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="테이블 수"
            value={tableInfo.length}
            format="number"
            icon={<HardDrive className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="최신 데이터"
            value={latestUpdate ? formatDate(latestUpdate.toISOString()) : '-'}
            icon={<Clock className="w-5 h-5" />}
            status="neutral"
          />
        </Dashboard.KPISection>

        <Dashboard.ChartsSection columns={1}>
          <Chart title={`일별 데이터 적재량 (${dateRange.days}일)`} height={300}>
            <BarChart data={chartData}>
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
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </Chart>
        </Dashboard.ChartsSection>

        <div className="mb-6">
          <DataTable data={tableInfo} columns={tableColumns} rowKey="name">
            <DataTable.Toolbar>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                테이블 목록
              </h3>
              <DataTable.Stats>
                <DataTable.StatItem label="총 테이블" value={`${tableInfo.length}개`} colorClass="text-blue-400" />
                <DataTable.StatItem label="총 레코드" value={`${totalRecords.toLocaleString()}`} colorClass="text-emerald-400" />
              </DataTable.Stats>
            </DataTable.Toolbar>
            <DataTable.Content>
              <DataTable.Header />
              <DataTable.Body emptyMessage="테이블 정보가 없습니다." />
            </DataTable.Content>
          </DataTable>
        </div>
      </Dashboard.Content>
    </Dashboard>
  );
}
