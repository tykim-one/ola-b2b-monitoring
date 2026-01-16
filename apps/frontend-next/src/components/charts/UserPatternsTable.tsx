'use client';

import React, { useState } from 'react';
import { MessageSquare, User, TrendingUp, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { UserQuestionPattern } from '@ola/shared-types';

interface UserPatternsTableProps {
  data: UserQuestionPattern[];
  title?: string;
  maxDisplay?: number;
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

const truncateUserId = (userId: string, maxLen: number = 16): string => {
  if (userId.length <= maxLen) return userId;
  return `${userId.substring(0, maxLen)}...`;
};

const UserPatternsTable: React.FC<UserPatternsTableProps> = ({
  data,
  title = '유저별 자주 묻는 질문',
  maxDisplay = 30,
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>('');

  // Filter by userId if specified
  const filteredData = filterUserId
    ? data.filter((item) => item.userId.toLowerCase().includes(filterUserId.toLowerCase()))
    : data;

  // Top N patterns
  const displayData = filteredData.slice(0, maxDisplay);

  // Unique users count
  const uniqueUsers = new Set(data.map((item) => item.userId)).size;
  const totalPatterns = data.length;
  const totalFrequency = data.reduce((sum, d) => sum + d.frequency, 0);

  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>

        <div className="flex flex-wrap gap-4 items-center">
          {/* User ID Filter */}
          <input
            type="text"
            placeholder="유저 ID 검색..."
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-40"
          />

          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-right">
              <div className="text-slate-400 text-xs">유저 수</div>
              <div className="text-blue-400 font-bold">{uniqueUsers}명</div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-xs">총 패턴</div>
              <div className="text-purple-400 font-bold">{totalPatterns}개</div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-xs">총 빈도</div>
              <div className="text-emerald-400 font-bold">{totalFrequency.toLocaleString()}회</div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-2 text-slate-400 font-medium w-8"></th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <User size={14} />
                  유저 ID
                </div>
              </th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <MessageSquare size={14} />
                  질문 패턴
                </div>
              </th>
              <th className="text-center py-3 px-2 text-slate-400 font-medium w-20">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp size={14} />
                  빈도
                </div>
              </th>
              <th className="text-center py-3 px-2 text-slate-400 font-medium w-32">
                <div className="flex items-center justify-center gap-1">
                  <Clock size={14} />
                  최근 질문
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  {filterUserId ? '검색 결과가 없습니다' : '데이터가 없습니다'}
                </td>
              </tr>
            ) : (
              displayData.map((item, index) => (
                <React.Fragment key={index}>
                  <tr
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors ${
                      expandedRow === index ? 'bg-slate-700/30' : ''
                    }`}
                    onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                  >
                    <td className="py-3 px-2 text-slate-500">
                      {expandedRow === index ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="text-blue-400 font-mono text-xs"
                        title={item.userId}
                      >
                        {truncateUserId(item.userId)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="text-white truncate block max-w-[350px]"
                        title={item.question}
                      >
                        {item.question}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span
                        className={`font-medium ${
                          item.frequency >= 10
                            ? 'text-rose-400'
                            : item.frequency >= 5
                            ? 'text-yellow-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.frequency}회
                      </span>
                    </td>
                    <td className="text-center py-3 px-2 text-slate-400 text-xs">
                      {formatDate(item.lastAsked)}
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr className="bg-slate-700/20">
                      <td colSpan={5} className="py-4 px-4">
                        <div className="space-y-3">
                          <div>
                            <div className="text-slate-400 text-xs mb-1">전체 유저 ID:</div>
                            <div className="text-blue-400 bg-slate-900 p-2 rounded font-mono text-xs break-all">
                              {item.userId}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-xs mb-1">전체 질문:</div>
                            <div className="text-white bg-slate-900 p-3 rounded-lg text-sm break-all">
                              {item.question}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > maxDisplay && (
        <div className="mt-4 text-center text-slate-500 text-sm">
          상위 {maxDisplay}개 패턴 표시 중 (전체 {filteredData.length}개)
        </div>
      )}
    </div>
  );
};

export default UserPatternsTable;
