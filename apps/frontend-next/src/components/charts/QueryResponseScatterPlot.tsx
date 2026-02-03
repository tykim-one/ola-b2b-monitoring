'use client';

import React, { useState } from 'react';
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
}

const QueryResponseScatterPlot: React.FC<QueryResponseScatterPlotProps> = ({
  data,
  title = '질문-응답 길이 상관관계',
}) => {
  const [selectedItem, setSelectedItem] = useState<CorrelationData | null>(null);

  // 효율성 비율에 따른 색상 분류
  const highEfficiency = data.filter((d) => d.efficiency_ratio >= 2);
  const normalEfficiency = data.filter(
    (d) => d.efficiency_ratio >= 0.5 && d.efficiency_ratio < 2
  );
  const lowEfficiency = data.filter((d) => d.efficiency_ratio < 0.5);

  // 상관계수 계산 (피어슨)
  const calcCorrelation = () => {
    if (data.length < 2) return 0;
    const n = data.length;
    const sumX = data.reduce((s, d) => s + d.query_length, 0);
    const sumY = data.reduce((s, d) => s + d.response_length, 0);
    const sumXY = data.reduce((s, d) => s + d.query_length * d.response_length, 0);
    const sumX2 = data.reduce((s, d) => s + d.query_length * d.query_length, 0);
    const sumY2 = data.reduce((s, d) => s + d.response_length * d.response_length, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const correlation = calcCorrelation();

  // 클릭 이벤트 핸들러
  const handleScatterClick = (data: { payload: CorrelationData }) => {
    if (data?.payload) {
      setSelectedItem(data.payload);
    }
  };

  // 효율성 등급 판정
  const getEfficiencyLabel = (ratio: number) => {
    if (ratio >= 2) return { text: '높은 효율성', color: 'text-emerald-400' };
    if (ratio >= 0.5) return { text: '정상', color: 'text-blue-400' };
    return { text: '낮은 효율성', color: 'text-rose-400' };
  };

  return (
    <>
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-400 mt-1">클릭하여 상세 내용 보기</p>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs">상관계수</div>
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
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="query_length"
                name="질문 길이"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                label={{
                  value: '질문 길이 (문자)',
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="response_length"
                name="응답 길이"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                label={{
                  value: '응답 길이 (문자)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748b',
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
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: 'white',
                }}
                labelStyle={{ color: 'white' }}
                itemStyle={{ color: 'white' }}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    query_length: '질문 길이',
                    response_length: '응답 길이',
                    efficiency_ratio: '효율성',
                  };
                  return [value, labels[String(name)] || String(name)];
                }}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    const item = payload[0].payload as CorrelationData;
                    return `${item.tenant_id} (클릭하여 상세보기)`;
                  }
                  return '';
                }}
              />
              <Legend
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    high: '높은 효율성 (2x+)',
                    normal: '정상 (0.5-2x)',
                    low: '낮은 효율성 (<0.5x)',
                  };
                  return <span className="text-slate-400 text-xs">{labels[value] || value}</span>;
                }}
              />
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
          </ResponsiveContainer>
        </div>
      </div>

      {/* 상세 분석 모달 */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="질문-응답 상세 분석"
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* 메타 정보 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-xs text-slate-400">테넌트</div>
                <div className="text-sm font-medium text-white">{selectedItem.tenant_id}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-xs text-slate-400">효율성</div>
                <div className={`text-sm font-medium ${getEfficiencyLabel(selectedItem.efficiency_ratio).color}`}>
                  {selectedItem.efficiency_ratio.toFixed(2)}x ({getEfficiencyLabel(selectedItem.efficiency_ratio).text})
                </div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-xs text-slate-400">입력 토큰</div>
                <div className="text-sm font-medium text-white">{selectedItem.input_tokens.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-xs text-slate-400">출력 토큰</div>
                <div className="text-sm font-medium text-white">{selectedItem.output_tokens.toLocaleString()}</div>
              </div>
            </div>

            {/* 질문 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <h4 className="text-sm font-semibold text-blue-400">사용자 질문</h4>
                <span className="text-xs text-slate-500">({selectedItem.query_length.toLocaleString()}자)</span>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 max-h-48 overflow-y-auto">
                <p className="text-sm text-slate-200 whitespace-pre-wrap">
                  {selectedItem.user_input || '(데이터 없음)'}
                </p>
              </div>
            </div>

            {/* 응답 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <h4 className="text-sm font-semibold text-emerald-400">LLM 응답</h4>
                <span className="text-xs text-slate-500">({selectedItem.response_length.toLocaleString()}자)</span>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 max-h-80 overflow-y-auto">
                {selectedItem.llm_response ? (
                  <MarkdownViewer content={selectedItem.llm_response} size="sm" />
                ) : (
                  <p className="text-sm text-slate-400">(데이터 없음)</p>
                )}
              </div>
            </div>

            {/* 타임스탬프 */}
            <div className="text-right text-xs text-slate-500">
              {selectedItem.timestamp}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default QueryResponseScatterPlot;
