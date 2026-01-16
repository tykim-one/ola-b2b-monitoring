'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChatbot } from '@/contexts/ChatbotContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

const PAGE_EXAMPLES: Record<string, string[]> = {
  '/dashboard': ['현재 전체 상태는 어때?', '주요 지표 요약해줘'],
  '/dashboard/operations': ['현재 에러율이 높은 이유는?', '트래픽 패턴 분석해줘', '이상 징후가 있어?'],
  '/dashboard/business': ['비용이 가장 많이 나가는 테넌트는?', '이번 주 사용량 트렌드는?', '테넌트별 효율성 비교해줘'],
  '/dashboard/quality': ['토큰 효율성이 낮은 패턴은?', '반복되는 질문 패턴 분석해줘', '품질 개선이 필요한 부분은?'],
  '/dashboard/ai-performance': ['AI 성능 트렌드는 어때?', '이상 탐지 결과 분석해줘', '토큰 사용 효율성은?'],
  '/dashboard/user-analytics': ['가장 활발한 사용자는?', '사용자별 패턴 분석해줘', '자주 묻는 질문은?'],
  '/dashboard/chatbot-quality': ['불만족스러운 대화가 있어?', '재질문이 많은 세션 분석해줘', '새로 등장한 질문 패턴은?'],
};

function getPageName(pathname: string): string {
  const names: Record<string, string> = {
    '/dashboard': 'Main Dashboard',
    '/dashboard/operations': 'Operations',
    '/dashboard/business': 'Business',
    '/dashboard/quality': 'Quality',
    '/dashboard/ai-performance': 'AI Performance',
    '/dashboard/user-analytics': 'User Analytics',
    '/dashboard/chatbot-quality': 'Chatbot Quality',
  };

  for (const [pattern, name] of Object.entries(names)) {
    if (pathname === pattern || pathname.startsWith(pattern + '/')) {
      return name;
    }
  }
  return 'Dashboard';
}

function getExampleQuestions(pathname: string): string[] {
  for (const [pattern, examples] of Object.entries(PAGE_EXAMPLES)) {
    if (pathname === pattern || pathname.startsWith(pattern + '/')) {
      return examples;
    }
  }
  return PAGE_EXAMPLES['/dashboard'];
}

export default function ChatWindow() {
  const { messages, isLoading, error, currentPage, closeChatbot, sendMessage, clearChat } = useChatbot();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  const pageName = getPageName(currentPage);
  const exampleQuestions = getExampleQuestions(currentPage);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.chat-header')) {
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
      };
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaY = e.clientY - dragRef.current.startY;
        setPosition({
          x: dragRef.current.startPosX + deltaX,
          y: dragRef.current.startPosY + deltaY,
        });
      }
      if (isResizing) {
        const deltaX = resizeRef.current.startX - e.clientX;
        const deltaY = resizeRef.current.startY - e.clientY;
        setSize({
          width: Math.max(320, Math.min(800, resizeRef.current.startWidth + deltaX)),
          height: Math.max(400, Math.min(800, resizeRef.current.startHeight + deltaY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const handleExampleClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <div
      className="fixed z-50 bg-slate-800/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden"
      style={{
        width: `${size.width}px`,
        height: `${size.height}px`,
        right: `${24 - position.x}px`,
        bottom: `${88 - position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-10"
        onMouseDown={handleResizeMouseDown}
      >
        <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-slate-500/50" />
      </div>

      {/* Header */}
      <div className="chat-header flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-700/50 cursor-move">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-100">AI Assistant</h3>
            <p className="text-xs text-slate-400">{pageName} 데이터 기반</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Clear chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={closeChatbot}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="text-slate-200 font-medium mb-2">무엇이든 물어보세요</h4>
            <p className="text-slate-400 text-sm mb-4">현재 {pageName} 페이지의 데이터를 기반으로 답변합니다</p>
            <div className="w-full space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">예시 질문</p>
              {exampleQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(question)}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-slate-700/30 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-slate-700/50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-slate-400">분석 중...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-700/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-900/30">
        <ChatInput onSend={sendMessage} disabled={isLoading} placeholder="메시지를 입력하세요..." />
      </div>
    </div>
  );
}
