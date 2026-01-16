'use client';

import { AnalysisMessage } from '@ola/shared-types';
import { useState } from 'react';

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

  const renderContent = () => {
    if (isUser) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>;
    }

    // Simple markdown rendering for AI responses
    const lines = message.content.split('\n');
    return (
      <div className="text-sm leading-relaxed space-y-2">
        {lines.map((line, i) => {
          // Headers
          if (line.startsWith('# ')) {
            return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={i} className="text-lg font-bold mt-3 mb-1">{line.slice(3)}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={i} className="text-base font-semibold mt-2 mb-1">{line.slice(4)}</h3>;
          }

          // Lists
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <li key={i} className="ml-4 list-disc">
                {line.slice(2)}
              </li>
            );
          }

          // Code blocks (simplified)
          if (line.startsWith('```')) {
            return <div key={i} className="bg-slate-900 px-3 py-2 rounded text-xs font-mono">{line}</div>;
          }

          // Bold
          const boldRegex = /\*\*(.+?)\*\*/g;
          if (boldRegex.test(line)) {
            const parts = line.split(boldRegex);
            return (
              <p key={i}>
                {parts.map((part, j) =>
                  j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
                )}
              </p>
            );
          }

          // Empty line
          if (line.trim() === '') {
            return <div key={i} className="h-2" />;
          }

          return <p key={i}>{line}</p>;
        })}
      </div>
    );
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
              : 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-100 rounded-bl-sm border border-slate-600'
            }
          `}
        >
          {renderContent()}
        </div>

        {/* Footer: Timestamp and Metadata */}
        <div className={`flex items-center gap-3 mt-1 px-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-slate-500">{formatTime(message.createdAt)}</span>

          {!isUser && message.metadata && (
            <>
              {message.metadata.totalTokens && (
                <span className="text-xs text-slate-600">
                  {message.metadata.totalTokens.toLocaleString()} tokens
                </span>
              )}
              {message.metadata.latencyMs && (
                <span className="text-xs text-slate-600">
                  {message.metadata.latencyMs}ms
                </span>
              )}
            </>
          )}

          {/* Copy Button (AI messages only) */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-500 hover:text-slate-300"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
