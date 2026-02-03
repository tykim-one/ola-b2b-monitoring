'use client';

import React from 'react';
import { X, Clock, User, Hash, Tag, CheckCircle, XCircle } from 'lucide-react';
import { ProblematicChat, ProblematicChatRule } from '@ola/shared-types';

interface ProblematicChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ProblematicChat | null;
  rules: ProblematicChatRule[];
}

export default function ProblematicChatDialog({
  isOpen,
  onClose,
  chat,
  rules,
}: ProblematicChatDialogProps) {
  if (!isOpen || !chat) return null;

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRuleDetails = (ruleName: string) => {
    return rules.find((r) => r.name === ruleName);
  };

  const getRuleColor = (ruleName: string) => {
    const rule = getRuleDetails(ruleName);
    if (!rule) return 'bg-slate-600';
    if (rule.type === 'token_threshold') return 'bg-amber-600';
    if (rule.type === 'keyword_match') return 'bg-rose-600';
    if (rule.type === 'token_ratio') return 'bg-cyan-600';
    return 'bg-slate-600';
  };

  // 매칭된 keyword_match 규칙들에서 키워드 추출
  const getMatchedKeywords = (): string[] => {
    const keywords: string[] = [];
    chat.matchedRules.forEach((ruleName) => {
      const rule = getRuleDetails(ruleName);
      if (rule?.type === 'keyword_match' && rule.config.keywords) {
        keywords.push(...rule.config.keywords);
      }
    });
    return [...new Set(keywords)]; // 중복 제거
  };

  // 텍스트에서 키워드 하이라이팅
  const highlightKeywords = (text: string, keywords: string[]): React.ReactNode => {
    if (!text || keywords.length === 0) return text || '-';

    // 키워드를 정규식으로 변환 (대소문자 무시, 특수문자 이스케이프)
    const escapedKeywords = keywords.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');

    const parts = text.split(regex);
    return parts.map((part, index) => {
      const isKeyword = keywords.some((kw) => kw.toLowerCase() === part.toLowerCase());
      if (isKeyword) {
        return (
          <mark
            key={index}
            className="bg-yellow-500/40 text-yellow-200 px-0.5 rounded"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const matchedKeywords = getMatchedKeywords();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">문제 채팅 상세</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Meta Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                시간
              </div>
              <div className="text-white text-sm">{formatTimestamp(chat.timestamp)}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <User className="w-4 h-4" />
                유저 ID
              </div>
              <div className="text-white text-sm font-mono truncate" title={chat.userId}>
                {chat.userId || '-'}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Tag className="w-4 h-4" />
                테넌트
              </div>
              <div className="text-white text-sm">{chat.tenantId}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                {chat.success ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                상태
              </div>
              <div className={`text-sm ${chat.success ? 'text-green-400' : 'text-rose-400'}`}>
                {chat.success ? '성공' : '실패'}
              </div>
            </div>
          </div>

          {/* Token Info */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Hash className="w-4 h-4" />
                토큰 정보
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Input: </span>
                  <span className="text-white">{chat.inputTokens.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400">Output: </span>
                  <span className={chat.outputTokens < 1500 ? 'text-amber-400' : 'text-white'}>
                    {chat.outputTokens.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Total: </span>
                  <span className="text-white">{chat.totalTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Matched Rules */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-400 mb-2">매칭된 규칙</h4>
            <div className="flex flex-wrap gap-2">
              {chat.matchedRules.map((ruleName) => {
                const rule = getRuleDetails(ruleName);
                return (
                  <div
                    key={ruleName}
                    className={`px-3 py-1.5 rounded-lg text-sm text-white ${getRuleColor(ruleName)}`}
                  >
                    <div className="font-medium">{ruleName}</div>
                    {rule && (
                      <div className="text-xs opacity-75">
                        {rule.type === 'token_threshold'
                          ? `Output ${rule.config.operator === 'lt' ? '<' : '>'} ${rule.config.threshold}`
                          : rule.type === 'keyword_match'
                            ? `키워드: ${rule.config.keywords?.join(', ')}`
                            : `비율: ${rule.config.minRatio ?? '-'} ~ ${rule.config.maxRatio ?? '-'}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Input */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-400 mb-2">사용자 입력</h4>
            <div className="bg-slate-900/50 rounded-lg p-4 text-white whitespace-pre-wrap text-sm max-h-[200px] overflow-y-auto">
              {chat.userInput || '-'}
            </div>
          </div>

          {/* LLM Response */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-400">LLM 응답</h4>
              {matchedKeywords.length > 0 && (
                <span className="text-xs text-yellow-400">
                  하이라이팅 키워드: {matchedKeywords.join(', ')}
                </span>
              )}
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 text-white whitespace-pre-wrap text-sm max-h-[300px] overflow-y-auto">
              {highlightKeywords(chat.llmResponse, matchedKeywords)}
            </div>
          </div>

          {/* Session ID if exists */}
          {chat.sessionId && (
            <div className="mt-4 text-sm text-slate-400">
              <span className="font-medium">세션 ID: </span>
              <span className="font-mono">{chat.sessionId}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
