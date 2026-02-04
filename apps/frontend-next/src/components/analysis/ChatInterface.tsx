'use client';

import { AnalysisSession, AnalysisMessage, SendMessageRequest } from '@ola/shared-types';
import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

interface ChatInterfaceProps {
  session: AnalysisSession | null;
  onSendMessage: (request: SendMessageRequest) => Promise<void>;
  loading?: boolean;
}

export default function ChatInterface({ session, onSendMessage, loading = false }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [includeMetrics, setIncludeMetrics] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  // Auto-focus input when session changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [session?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !session) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      await onSendMessage({ content, includeMetrics });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input on error
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to AI Analysis</h2>
          <p className="text-gray-500 max-w-md">
            Create a new session or select an existing one to start analyzing your B2B monitoring data with AI assistance.
          </p>
        </div>
      </div>
    );
  }

  const messages = session.messages || [];

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-gray-900">{session.title}</h2>
          <p className="text-xs text-gray-500 mt-1">
            Session started {new Date(session.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="text-5xl">💡</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a conversation</h3>
                <p className="text-gray-500 max-w-md">
                  Ask questions about your B2B monitoring data, request analysis, or get insights from the AI.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                <button
                  onClick={() => setInput('지난 주 토큰 사용량이 급증한 테넌트를 분석해줘')}
                  className="bg-white hover:bg-gray-100 text-left p-4 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="text-sm font-semibold text-gray-900 mb-1">Token Usage Analysis</div>
                  <div className="text-xs text-gray-500">Analyze tenant token usage trends</div>
                </button>
                <button
                  onClick={() => setInput('가장 비효율적인 테넌트를 찾아서 개선 방안을 제시해줘')}
                  className="bg-white hover:bg-gray-100 text-left p-4 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="text-sm font-semibold text-gray-900 mb-1">Efficiency Report</div>
                  <div className="text-xs text-gray-500">Find inefficient tenants and suggest improvements</div>
                </button>
                <button
                  onClick={() => setInput('오늘 발생한 에러를 요약하고 원인을 분석해줘')}
                  className="bg-white hover:bg-gray-100 text-left p-4 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="text-sm font-semibold text-gray-900 mb-1">Error Summary</div>
                  <div className="text-xs text-gray-500">Summarize and analyze today's errors</div>
                </button>
                <button
                  onClick={() => setInput('비용 최적화를 위한 추천 사항을 알려줘')}
                  className="bg-white hover:bg-gray-100 text-left p-4 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="text-sm font-semibold text-gray-900 mb-1">Cost Optimization</div>
                  <div className="text-xs text-gray-500">Get cost optimization recommendations</div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {sending && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-300">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200 p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Metrics Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeMetrics"
                checked={includeMetrics}
                onChange={(e) => setIncludeMetrics(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 bg-gray-100 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
              />
              <label htmlFor="includeMetrics" className="text-xs text-gray-500 cursor-pointer">
                Include current metrics in context
              </label>
            </div>

            {/* Input Field */}
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or request analysis..."
                disabled={sending}
                rows={1}
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50"
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Send'
                )}
              </button>
            </div>

            {/* Hint */}
            <p className="text-xs text-gray-400 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Shift+Enter</kbd> for new line
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
