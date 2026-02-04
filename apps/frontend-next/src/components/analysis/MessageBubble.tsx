'use client';

import { AnalysisMessage } from '@ola/shared-types';
import { useState } from 'react';
import { MarkdownViewer } from '@/components/markdown';

interface MessageBubbleProps {
  message: AnalysisMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group animate-fade-in`}>
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Message Bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl shadow-lg
            ${isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm border border-gray-200'
            }
          `}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownViewer content={message.content} size="sm" className="text-sm" />
          )}
        </div>

        {/* Footer: Timestamp and Metadata */}
        <div className={`flex items-center gap-3 mt-1 px-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>

          {!isUser && message.metadata && (
            <>
              {message.metadata.totalTokens && (
                <span className="text-xs text-gray-400">
                  {message.metadata.totalTokens.toLocaleString()} tokens
                </span>
              )}
              {message.metadata.latencyMs && (
                <span className="text-xs text-gray-400">
                  {message.metadata.latencyMs}ms
                </span>
              )}
            </>
          )}

          {/* Copy Button (AI messages only) */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 hover:text-gray-600"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
