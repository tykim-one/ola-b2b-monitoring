'use client';

import React, { useState } from 'react';
import { AlertTriangle, Eye, Clock, User, Hash, MessageSquare } from 'lucide-react';
import { ProblematicChat, ProblematicChatRule, getFieldDefinition, isCompoundConfig } from '@ola/shared-types';

interface ProblematicChatTableProps {
  data: ProblematicChat[];
  rules: ProblematicChatRule[];
  title?: string;
  onViewDetail: (chat: ProblematicChat) => void;
  loading?: boolean;
}

export default function ProblematicChatTable({
  data,
  rules,
  title = '문제 채팅 목록',
  onViewDetail,
  loading = false,
}: ProblematicChatTableProps) {
  const [sortField, setSortField] = useState<keyof ProblematicChat>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof ProblematicChat) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * direction;
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * direction;
    }
    return 0;
  });

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const maskUserId = (userId: string) => {
    if (!userId || userId === 'unknown') return '-';
    if (userId.length <= 8) return userId;
    return userId.substring(0, 4) + '****' + userId.substring(userId.length - 4);
  };

  const getRuleColor = (ruleName: string) => {
    const rule = rules.find((r) => r.name === ruleName);
    if (!rule) return 'bg-slate-600';
    if (isCompoundConfig(rule.config)) return 'bg-purple-600';
    const fieldDef = getFieldDefinition(rule.config.field);
    if (!fieldDef) return 'bg-slate-600';
    if (fieldDef.dataType === 'numeric') return 'bg-amber-600';
    if (fieldDef.dataType === 'text') return 'bg-rose-600';
    if (fieldDef.dataType === 'boolean') return 'bg-cyan-600';
    return 'bg-slate-600';
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-slate-400">로딩 중...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
          <p>필터링 조건에 맞는 문제 채팅이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          {title}
        </h3>
        <span className="text-sm text-slate-400">{data.length}건</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-700">
              <th
                className="pb-3 pr-4 cursor-pointer hover:text-white"
                onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  시간
                  {sortField === 'timestamp' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="pb-3 pr-4">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  유저
                </div>
              </th>
              <th className="pb-3 pr-4">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  입력
                </div>
              </th>
              <th className="pb-3 pr-4">응답</th>
              <th
                className="pb-3 pr-4 cursor-pointer hover:text-white"
                onClick={() => handleSort('outputTokens')}
              >
                <div className="flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  토큰
                  {sortField === 'outputTokens' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="pb-3 pr-4">매칭 규칙</th>
              <th className="pb-3">액션</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((chat) => (
              <tr
                key={chat.id}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
              >
                <td className="py-3 pr-4 text-slate-300 whitespace-nowrap">
                  {formatTimestamp(chat.timestamp)}
                </td>
                <td className="py-3 pr-4 text-slate-300 font-mono text-xs truncate max-w-[180px]" title={chat.userId}>
                  {chat.userId || '-'}
                </td>
                <td className="py-3 pr-4 text-slate-300 max-w-[200px]">
                  <span title={chat.userInput}>{truncateText(chat.userInput)}</span>
                </td>
                <td className="py-3 pr-4 text-slate-400 max-w-[200px]">
                  <span title={chat.llmResponse}>{truncateText(chat.llmResponse)}</span>
                </td>
                <td className="py-3 pr-4 text-slate-300">
                  <span className={chat.outputTokens < 1500 ? 'text-amber-400' : ''}>
                    {chat.outputTokens.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {chat.matchedRules.map((ruleName) => (
                      <span
                        key={ruleName}
                        className={`px-2 py-0.5 text-xs rounded-full text-white ${getRuleColor(ruleName)}`}
                      >
                        {ruleName}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3">
                  <button
                    onClick={() => onViewDetail(chat)}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                    title="상세 보기"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
