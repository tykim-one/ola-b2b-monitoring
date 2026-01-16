'use client';

import React, { useMemo } from 'react';
import type { ChatbotMessage } from '@ola/shared-types';

interface ChatMessageProps {
  message: ChatbotMessage;
}

/**
 * Simple markdown-like formatting for chat messages
 */
function formatContent(content: string): React.ReactNode {
  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    // Handle code blocks
    if (part.startsWith('```') && part.endsWith('```')) {
      const codeContent = part.slice(3, -3);
      const lines = codeContent.split('\n');
      const language = lines[0].trim();
      const code = language ? lines.slice(1).join('\n') : codeContent;

      return (
        <pre
          key={index}
          className="bg-slate-900/50 rounded-md p-3 my-2 overflow-x-auto text-sm"
        >
          <code className="text-slate-300">{code}</code>
        </pre>
      );
    }

    // Handle inline formatting
    return (
      <span key={index}>
        {part.split('\n').map((line, lineIndex) => {
          // Bold
          let formattedLine: React.ReactNode = line.replace(
            /\*\*(.*?)\*\*/g,
            '<strong>$1</strong>'
          );

          // Inline code
          formattedLine = line
            .split(/(`[^`]+`)/)
            .map((segment, segIndex) => {
              if (segment.startsWith('`') && segment.endsWith('`')) {
                return (
                  <code
                    key={segIndex}
                    className="bg-slate-700/50 px-1.5 py-0.5 rounded text-sm text-blue-300"
                  >
                    {segment.slice(1, -1)}
                  </code>
                );
              }
              // Handle bold within non-code segments
              return segment.split(/(\*\*[^*]+\*\*)/).map((part2, part2Index) => {
                if (part2.startsWith('**') && part2.endsWith('**')) {
                  return (
                    <strong key={part2Index} className="font-semibold">
                      {part2.slice(2, -2)}
                    </strong>
                  );
                }
                return part2;
              });
            });

          return (
            <React.Fragment key={lineIndex}>
              {formattedLine}
              {lineIndex < part.split('\n').length - 1 && <br />}
            </React.Fragment>
          );
        })}
      </span>
    );
  });
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const formattedContent = useMemo(
    () => formatContent(message.content),
    [message.content]
  );

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-slate-700/50 text-slate-100 rounded-bl-md'
        }`}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {formattedContent}
        </div>
        {message.metadata && !isUser && (
          <div className="mt-2 pt-2 border-t border-slate-600/30 flex items-center gap-3 text-xs text-slate-400">
            {message.metadata.model && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {message.metadata.model}
              </span>
            )}
            {message.metadata.latencyMs && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {(message.metadata.latencyMs / 1000).toFixed(2)}s
              </span>
            )}
            {message.metadata.tokens && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {message.metadata.tokens} tokens
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
