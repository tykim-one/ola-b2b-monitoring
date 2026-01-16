'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  Coins,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Loader2,
} from 'lucide-react';
import { UserActivityDetail, UserListItem } from '@ola/shared-types';
import { fetchUserActivity } from '@/services/userAnalyticsService';

interface UserActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userInfo?: UserListItem;
  projectId: string;
}

type PeriodFilter = 1 | 7 | 30;

const formatDateTime = (date: string): string => {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date;
  }
};

const truncateText = (text: string, maxLen: number = 100): string => {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.substring(0, maxLen)}...`;
};

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const UserActivityDialog: React.FC<UserActivityDialogProps> = ({
  isOpen,
  onClose,
  userId,
  userInfo,
  projectId,
}) => {
  const [activities, setActivities] = useState<UserActivityDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>(7);
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const pageSize = 20;

  // Fetch activities when dialog opens or filters change
  useEffect(() => {
    if (isOpen && userId) {
      loadActivities();
    }
  }, [isOpen, userId, period, page]);

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserActivity(
        projectId,
        userId,
        period,
        pageSize,
        page * pageSize
      );
      setActivities(data);
    } catch (err) {
      setError('활동 내역을 불러오는 데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when period changes
  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    setPage(0);
    setExpandedRow(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <User size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">유저 활동 상세</h2>
                <p className="text-sm text-slate-400 font-mono">{truncateText(userId, 50)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {/* User Summary KPI Cards */}
          {userInfo && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 border-b border-slate-700 bg-slate-900/50">
              <div className="text-center">
                <div className="text-slate-400 text-xs mb-1">총 질문</div>
                <div className="text-xl font-bold text-white">
                  {formatNumber(userInfo.questionCount)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-xs mb-1">성공률</div>
                <div
                  className={`text-xl font-bold ${
                    userInfo.successRate >= 90
                      ? 'text-emerald-400'
                      : userInfo.successRate >= 70
                      ? 'text-yellow-400'
                      : 'text-rose-400'
                  }`}
                >
                  {userInfo.successRate.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-xs mb-1">총 토큰</div>
                <div className="text-xl font-bold text-purple-400">
                  {formatNumber(userInfo.totalTokens)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-xs mb-1">평균 토큰</div>
                <div className="text-xl font-bold text-blue-400">
                  {userInfo.avgTokens.toFixed(0)}
                </div>
              </div>
            </div>
          )}

          {/* Period Filter */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">기간:</span>
              <div className="flex gap-1">
                {[
                  { value: 1, label: '1일' },
                  { value: 7, label: '7일' },
                  { value: 30, label: '30일' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePeriodChange(option.value as PeriodFilter)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      period === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0 || loading}
                className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-slate-400 text-sm">
                페이지 {page + 1}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={activities.length < pageSize || loading}
                className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon size={18} />
              </button>
            </div>
          </div>

          {/* Activity Table */}
          <div className="overflow-y-auto max-h-[50vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="text-blue-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-rose-400">{error}</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                해당 기간에 활동 내역이 없습니다.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800">
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium w-8"></th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium w-36">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        시간
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      <div className="flex items-center gap-1">
                        <MessageSquare size={14} />
                        질문
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium w-32">응답</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium w-24">
                      <div className="flex items-center justify-center gap-1">
                        <Coins size={14} />
                        토큰
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium w-20">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, index) => (
                    <React.Fragment key={index}>
                      <tr
                        className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors ${
                          expandedRow === index ? 'bg-slate-700/30' : ''
                        }`}
                        onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                      >
                        <td className="py-3 px-4 text-slate-500">
                          {expandedRow === index ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                          {formatDateTime(activity.timestamp)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-white truncate block max-w-[300px]" title={activity.userInput}>
                            {truncateText(activity.userInput, 60)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-400 truncate block max-w-[150px]" title={activity.llmResponse}>
                            {truncateText(activity.llmResponse, 30)}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 text-slate-300">
                          {formatNumber(activity.totalTokens)}
                        </td>
                        <td className="text-center py-3 px-4">
                          {activity.success ? (
                            <CheckCircle size={18} className="text-emerald-400 mx-auto" />
                          ) : (
                            <XCircle size={18} className="text-rose-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                      {expandedRow === index && (
                        <tr className="bg-slate-900/50">
                          <td colSpan={6} className="py-4 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-slate-400 text-xs mb-2">질문 전체:</div>
                                <div className="text-white bg-slate-800 p-3 rounded-lg text-sm break-all max-h-48 overflow-y-auto">
                                  {activity.userInput || '(내용 없음)'}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-400 text-xs mb-2">응답 전체:</div>
                                <div className="text-slate-300 bg-slate-800 p-3 rounded-lg text-sm break-all max-h-48 overflow-y-auto">
                                  {activity.llmResponse || '(내용 없음)'}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-4 mt-4 text-sm">
                              <div className="text-slate-400">
                                입력 토큰: <span className="text-blue-400 font-medium">{formatNumber(activity.inputTokens)}</span>
                              </div>
                              <div className="text-slate-400">
                                출력 토큰: <span className="text-purple-400 font-medium">{formatNumber(activity.outputTokens)}</span>
                              </div>
                              <div className="text-slate-400">
                                총 토큰: <span className="text-white font-medium">{formatNumber(activity.totalTokens)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserActivityDialog;
