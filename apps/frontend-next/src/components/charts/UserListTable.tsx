'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  Coins,
  Calendar,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { UserListItem } from '@ola/shared-types';

interface UserListTableProps {
  data: UserListItem[];
  title?: string;
  onUserClick?: (userId: string) => void;
}

type SortField = 'questionCount' | 'successRate' | 'totalTokens' | 'avgTokens' | 'errorCount' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

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

const truncateUserId = (userId: string, maxLen: number = 20): string => {
  if (userId.length <= maxLen) return userId;
  return `${userId.substring(0, maxLen)}...`;
};

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const UserListTable: React.FC<UserListTableProps> = ({
  data,
  title = '유저 목록',
  onUserClick,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('questionCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Reset page when search or sort changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, sortField, sortDirection]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter((item) =>
        item.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aValue: number | string = a[sortField];
      let bValue: number | string = b[sortField];

      // Handle date sorting
      if (sortField === 'lastActivity') {
        aValue = new Date(a.lastActivity).getTime();
        bValue = new Date(b.lastActivity).getTime();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }, [data, searchTerm, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} className="inline ml-1" />
    ) : (
      <ChevronDown size={14} className="inline ml-1" />
    );
  };

  // Summary stats
  const totalUsers = data.length;
  const totalQuestions = data.reduce((sum, d) => sum + d.questionCount, 0);
  const avgSuccessRate =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.successRate, 0) / data.length
      : 0;

  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>

        <div className="flex flex-wrap gap-4 items-center">
          {/* Search Input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="유저 ID 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>

          {/* Summary Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-right">
              <div className="text-slate-400 text-xs">총 유저</div>
              <div className="text-blue-400 font-bold">{formatNumber(totalUsers)}명</div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-xs">총 질문</div>
              <div className="text-purple-400 font-bold">{formatNumber(totalQuestions)}개</div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-xs">평균 성공률</div>
              <div className="text-emerald-400 font-bold">{avgSuccessRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-2 text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <User size={14} />
                  유저 ID
                </div>
              </th>
              <th
                className="text-center py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('questionCount')}
              >
                <div className="flex items-center justify-center gap-1">
                  <MessageSquare size={14} />
                  질문수
                  <SortIndicator field="questionCount" />
                </div>
              </th>
              <th
                className="text-center py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('successRate')}
              >
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle size={14} />
                  성공률
                  <SortIndicator field="successRate" />
                </div>
              </th>
              <th
                className="text-center py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('totalTokens')}
              >
                <div className="flex items-center justify-center gap-1">
                  <Coins size={14} />
                  총 토큰
                  <SortIndicator field="totalTokens" />
                </div>
              </th>
              <th
                className="text-center py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('avgTokens')}
              >
                <div className="flex items-center justify-center gap-1">
                  평균 토큰
                  <SortIndicator field="avgTokens" />
                </div>
              </th>
              <th
                className="text-center py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('errorCount')}
              >
                <div className="flex items-center justify-center gap-1">
                  <XCircle size={14} />
                  에러
                  <SortIndicator field="errorCount" />
                </div>
              </th>
              <th className="text-center py-3 px-2 text-slate-400 font-medium w-28">
                <div className="flex items-center justify-center gap-1">
                  <Calendar size={14} />
                  첫 활동
                </div>
              </th>
              <th
                className="text-center py-3 px-2 text-slate-400 font-medium w-28 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('lastActivity')}
              >
                <div className="flex items-center justify-center gap-1">
                  <Calendar size={14} />
                  마지막 활동
                  <SortIndicator field="lastActivity" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  {searchTerm ? '검색 결과가 없습니다' : '데이터가 없습니다'}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => onUserClick?.(item.userId)}
                >
                  <td className="py-3 px-2">
                    <span
                      className="text-blue-400 font-mono text-xs hover:underline"
                      title={item.userId}
                    >
                      {truncateUserId(item.userId)}
                    </span>
                  </td>
                  <td className="text-center py-3 px-2 text-white font-medium">
                    {formatNumber(item.questionCount)}
                  </td>
                  <td className="text-center py-3 px-2">
                    <span
                      className={`font-medium ${
                        item.successRate >= 90
                          ? 'text-emerald-400'
                          : item.successRate >= 70
                          ? 'text-yellow-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {item.successRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center py-3 px-2 text-slate-300">
                    {formatNumber(item.totalTokens)}
                  </td>
                  <td className="text-center py-3 px-2 text-slate-400">
                    {item.avgTokens.toFixed(0)}
                  </td>
                  <td className="text-center py-3 px-2">
                    <span
                      className={`font-medium ${
                        item.errorCount > 10
                          ? 'text-rose-400'
                          : item.errorCount > 0
                          ? 'text-yellow-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {item.errorCount}
                    </span>
                  </td>
                  <td className="text-center py-3 px-2 text-slate-400 text-xs">
                    {formatDate(item.firstActivity)}
                  </td>
                  <td className="text-center py-3 px-2 text-slate-400 text-xs">
                    {formatDate(item.lastActivity)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-slate-500 text-sm">
            {searchTerm
              ? `검색 결과: ${processedData.length}명`
              : `전체 ${data.length}명의 유저`}
            {processedData.length > pageSize && (
              <span className="ml-2 text-slate-400">
                ({currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, processedData.length)}명 표시)
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} className="text-slate-300" />
              </button>
              <span className="text-sm text-slate-400 min-w-[80px] text-center">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserListTable;
