'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from 'recharts';
import Modal from '../ui/Modal';
import MarkdownViewer from '../markdown/MarkdownViewer';
import { Chart } from '@/components/compound/Chart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chart-theme';
import { fetchCorrelationDetail, type CorrelationDetailData } from '@/hooks/queries/use-quality';

const xAxisTickFormatter = (v: number | string) => {
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  return num >= 1000 ? `${(num / 1000).toFixed(0)}K` : String(num);
};
const yAxisTickFormatter = (v: number | string) => {
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  return num >= 1000 ? `${(num / 1000).toFixed(0)}K` : String(num);
};

const tooltipFormatter = (value: unknown, name: unknown): [string, string] => {
  const labels: Record<string, string> = {
    query_length: '질문 길이',
    response_length: '응답 길이',
    efficiency_ratio: '효율성',
  };
  return [String(value), labels[String(name)] || String(name)];
};

const legendFormatter = (value: string) => {
  const labels: Record<string, string> = {
    high: '높은 효율성 (2x+)',
    normal: '정상 (0.5-2x)',
    low: '낮은 효율성 (<0.5x)',
  };
  return <span className="text-gray-500 text-xs">{labels[value] || value}</span>;
};

interface CorrelationData {
  tenant_id: string;
  query_length: number;
  response_length: number;
  input_tokens: number;
  output_tokens: number;
  efficiency_ratio: number;
  timestamp: string;
  user_input?: string;
  llm_response?: string;
}

interface QueryResponseScatterPlotProps {
  data: CorrelationData[];
  title?: string;
  projectId?: string;
}

const QueryResponseScatterPlot: React.FC<QueryResponseScatterPlotProps> = React.memo(({
  data,
  title = '질문-응답 길이 상관관계',
  projectId = 'ibks',
}) => {
  const [selectedItem, setSelectedItem] = useState<CorrelationData | null>(null);
  const [detail, setDetail] = useState<CorrelationDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 효율성 비율에 따른 색상 분류
  const { highEfficiency, normalEfficiency, lowEfficiency } = useMemo(() => ({
    highEfficiency: data.filter((d) => d.efficiency_ratio >= 2),
    normalEfficiency: data.filter((d) => d.efficiency_ratio >= 0.5 && d.efficiency_ratio < 2),
    lowEfficiency: data.filter((d) => d.efficiency_ratio < 0.5),
  }), [data]);

  // 상관계수 계산 (피어슨)
  const correlation = useMemo(() => {
    if (data.length < 2) return 0;
    const n = data.length;
    const sumX = data.reduce((s, d) => s + d.query_length, 0);
    const sumY = data.reduce((s, d) => s + d.response_length, 0);
    const sumXY = data.reduce((s, d) => s + d.query_length * d.response_length, 0);
    const sumX2 = data.reduce((s, d) => s + d.query_length * d.query_length, 0);
    const sumY2 = data.reduce((s, d) => s + d.response_length * d.response_length, 0);
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denominator === 0 ? 0 : numerator / denominator;
  }, [data]);

  // 클릭 이벤트 핸들러 — detail API lazy fetch
  const handleScatterClick = useCallback(async (clickData: { payload: CorrelationData }) => {
    if (clickData?.payload) {
      const item = clickData.payload;
      setSelectedItem(item);
      setDetail(null);
      setDetailLoading(true);
      try {
        const result = await fetchCorrelationDetail(projectId, item.timestamp, item.tenant_id);
        setDetail(result);
      } finally {
        setDetailLoading(false);
      }
    }
  }, [projectId]);

  // 효율성 등급 판정 - data 의존하지 않으므로 useCallback 불필요
  const getEfficiencyLabel = (ratio: number) => {
    if (ratio >= 2) return { text: '높은 효율성', color: 'text-emerald-400' };
    if (ratio >= 0.5) return { text: '정상', color: 'text-blue-400' };
    return { text: '낮은 효율성', color: 'text-rose-400' };
  };

  // tooltipLabelFormatter는 payload에 의존하므로 컴포넌트 내부에서 useCallback 처리
  const tooltipLabelFormatter = useCallback((_label: any, payload: any) => {
    if (payload && payload[0]) {
      const item = payload[0].payload as CorrelationData;
      return `${item.tenant_id} (클릭하여 상세보기)`;
    }
    return '';
  }, []);

  return (
    <>
      <Chart
        title={title}
        subtitle="클릭하여 상세 내용 보기"
        height={300}
        headerRight={
          <div className="text-right">
            <div className="text-gray-500 text-xs">상관계수</div>
            <div
              className={`font-bold ${
                correlation > 0.5
                  ? 'text-emerald-400'
                  : correlation > 0
                  ? 'text-yellow-400'
                  : 'text-rose-400'
              }`}
            >
              r = {correlation.toFixed(3)}
            </div>
          </div>
        }
      >
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            type="number"
            dataKey="query_length"
            name="질문 길이"
            stroke={CHART_COLORS.axis}
            fontSize={12}
            tickLine={false}
            tickFormatter={xAxisTickFormatter}
            label={{
              value: '질문 길이 (문자)',
              position: 'insideBottom',
              offset: -10,
              fill: CHART_COLORS.axisText,
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="response_length"
            name="응답 길이"
            stroke={CHART_COLORS.axis}
            fontSize={12}
            tickLine={false}
            tickFormatter={yAxisTickFormatter}
            label={{
              value: '응답 길이 (문자)',
              angle: -90,
              position: 'insideLeft',
              fill: CHART_COLORS.axisText,
              fontSize: 11,
            }}
          />
          <ZAxis
            type="number"
            dataKey="efficiency_ratio"
            range={[30, 150]}
            name="효율성"
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ strokeDasharray: '3 3' }}
            formatter={tooltipFormatter}
            labelFormatter={tooltipLabelFormatter}
          />
          <Legend formatter={legendFormatter} />
          <Scatter
            name="high"
            data={highEfficiency}
            fill="#10b981"
            onClick={handleScatterClick}
            cursor="pointer"
          />
          <Scatter
            name="normal"
            data={normalEfficiency}
            fill="#3b82f6"
            onClick={handleScatterClick}
            cursor="pointer"
          />
          <Scatter
            name="low"
            data={lowEfficiency}
            fill="#f43f5e"
            onClick={handleScatterClick}
            cursor="pointer"
          />
        </ScatterChart>
      </Chart>

      {/* 상세 분석 모달 */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => { setSelectedItem(null); setDetail(null); }}
        title="질문-응답 상세 분석"
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* 메타 정보 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500">테넌트</div>
                <div className="text-sm font-medium text-gray-900">{selectedItem.tenant_id}</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500">효율성</div>
                <div className={`text-sm font-medium ${getEfficiencyLabel(selectedItem.efficiency_ratio).color}`}>
                  {selectedItem.efficiency_ratio.toFixed(2)}x ({getEfficiencyLabel(selectedItem.efficiency_ratio).text})
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500">입력 토큰</div>
                <div className="text-sm font-medium text-gray-900">{selectedItem.input_tokens.toLocaleString()}</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500">출력 토큰</div>
                <div className="text-sm font-medium text-gray-900">{selectedItem.output_tokens.toLocaleString()}</div>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
                <span className="ml-3 text-sm text-gray-500">상세 내용 로딩 중...</span>
              </div>
            ) : (
              <>
                {/* 질문 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <h4 className="text-sm font-semibold text-blue-400">사용자 질문</h4>
                    <span className="text-xs text-gray-400">({selectedItem.query_length.toLocaleString()}자)</span>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {detail?.user_input || '(데이터 없음)'}
                    </p>
                  </div>
                </div>

                {/* 응답 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <h4 className="text-sm font-semibold text-emerald-400">LLM 응답</h4>
                    <span className="text-xs text-gray-400">({selectedItem.response_length.toLocaleString()}자)</span>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 max-h-80 overflow-y-auto">
                    {detail?.llm_response ? (
                      <MarkdownViewer content={detail.llm_response} size="sm" />
                    ) : (
                      <p className="text-sm text-gray-500">(데이터 없음)</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 타임스탬프 */}
            <div className="text-right text-xs text-gray-400">
              {selectedItem.timestamp}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
});

export default QueryResponseScatterPlot;
