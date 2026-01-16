'use client';

import React, { useState } from 'react';
import { MessageSquare, Users, TrendingUp, Clock } from 'lucide-react';

interface RepeatedQueryData {
  query_pattern: string;
  occurrence_count: number;
  unique_tenants: number;
  avg_response_length: number;
  avg_output_tokens: number;
  first_seen: string;
  last_seen: string;
}

interface RepeatedQueriesTableProps {
  data: RepeatedQueryData[];
  title?: string;
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

const RepeatedQueriesTable: React.FC<RepeatedQueriesTableProps> = ({
  data,
  title = '반복 질문 패턴 (FAQ 후보)',
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // 상위 20개만 표시
  const displayData = data.slice(0, 20);

  // 총 반복 횟수
  const totalOccurrences = data.reduce((sum, d) => sum + d.occurrence_count, 0);

  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-slate-400 text-xs">총 패턴</div>
            <div className="text-blue-400 font-bold">{data.length}개</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs">총 반복</div>
            <div className="text-emerald-400 font-bold">{totalOccurrences.toLocaleString()}회</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-2 text-slate-400 font-medium">질문 패턴</th>
              <th className="text-center py-3 px-2 text-slate-400 font-medium w-20">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp size={14} />
                  반복
                </div>
              </th>
              <th className="text-center py-3 px-2 text-slate-400 font-medium w-20">
                <div className="flex items-center justify-center gap-1">
                  <Users size={14} />
                  테넌트
                </div>
              </th>
              <th className="text-center py-3 px-2 text-slate-400 font-medium w-24">
                <div className="flex items-center justify-center gap-1">
                  <MessageSquare size={14} />
                  평균 응답
                </div>
              </th>
              <th className="text-center py-3 px-2 text-slate-400 font-medium w-28">
                <div className="flex items-center justify-center gap-1">
                  <Clock size={14} />
                  최근
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((item, index) => (
              <React.Fragment key={index}>
                <tr
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors ${
                    expandedRow === index ? 'bg-slate-700/30' : ''
                  }`}
                  onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-mono text-xs w-6">
                        {index + 1}.
                      </span>
                      <span className="text-white truncate max-w-[400px]" title={item.query_pattern}>
                        {item.query_pattern}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span
                      className={`font-medium ${
                        item.occurrence_count >= 10
                          ? 'text-rose-400'
                          : item.occurrence_count >= 5
                          ? 'text-yellow-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {item.occurrence_count}
                    </span>
                  </td>
                  <td className="text-center py-3 px-2 text-slate-300">
                    {item.unique_tenants}
                  </td>
                  <td className="text-center py-3 px-2 text-slate-300">
                    {item.avg_response_length >= 1000
                      ? `${(item.avg_response_length / 1000).toFixed(1)}K`
                      : item.avg_response_length}
                  </td>
                  <td className="text-center py-3 px-2 text-slate-400 text-xs">
                    {formatDate(item.last_seen)}
                  </td>
                </tr>
                {expandedRow === index && (
                  <tr className="bg-slate-700/20">
                    <td colSpan={5} className="py-4 px-4">
                      <div className="space-y-2">
                        <div className="text-slate-400 text-xs">전체 질문 패턴:</div>
                        <div className="text-white bg-slate-900 p-3 rounded-lg font-mono text-xs break-all">
                          {item.query_pattern}
                        </div>
                        <div className="flex gap-6 mt-3 text-xs">
                          <div>
                            <span className="text-slate-400">첫 발생:</span>{' '}
                            <span className="text-slate-300">{formatDate(item.first_seen)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">평균 토큰:</span>{' '}
                            <span className="text-slate-300">
                              {item.avg_output_tokens.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 20 && (
        <div className="mt-4 text-center text-slate-500 text-sm">
          상위 20개 패턴 표시 중 (전체 {data.length}개)
        </div>
      )}
    </div>
  );
};

export default RepeatedQueriesTable;
