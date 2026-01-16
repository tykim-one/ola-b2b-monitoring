'use client';

import React, { useEffect } from 'react';
import { useChatbot } from '@/contexts/ChatbotContext';
import ChatWindow from './ChatWindow';

export default function FloatingChatbot() {
  const { isOpen, toggleChatbot, messages } = useChatbot();
  const hasUnread = messages.length > 0 && !isOpen;

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleChatbot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleChatbot]);

  const buttonBaseClasses = 'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-900';
  const buttonStateClasses = isOpen
    ? 'bg-slate-700 hover:bg-slate-600'
    : 'bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500';

  return (
    <>
      {isOpen && <ChatWindow />}

      <button
        onClick={toggleChatbot}
        className={`${buttonBaseClasses} ${buttonStateClasses}`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <>
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-medium">
                  {messages.length > 9 ? '9+' : messages.length}
                </span>
              </span>
            )}
          </>
        )}
      </button>

      {!isOpen && messages.length === 0 && (
        <div className="fixed bottom-24 right-6 z-40 bg-slate-800/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-slate-700/50 animate-pulse">
          <p className="text-xs text-slate-400">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">
              Ctrl+K
            </kbd>
            {' '}로 열기
          </p>
        </div>
      )}
    </>
  );
}
