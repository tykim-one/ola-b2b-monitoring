'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2, ChartBar, Bot, User, Clock, Coins } from 'lucide-react';
import { AnalysisSession, AnalysisMessage, SendMessageRequest, AnalysisMessageMetadata } from '@ola/shared-types';
import { analysisApi } from '@/lib/api-client';
import { MarkdownViewer } from '@/components/markdown';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [includeMetrics, setIncludeMetrics] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const data = await analysisApi.getSession(sessionId);
      setSession(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleBack = () => {
    router.push('/dashboard/admin/analysis');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || sending) return;

    try {
      setSending(true);

      const request: SendMessageRequest = {
        content: message.trim(),
        includeMetrics,
      };

      const response = await analysisApi.sendMessage(sessionId, request);

      // Update session with new messages
      setSession((prev) => {
        if (!prev) return prev;
        const messages = prev.messages || [];
        return {
          ...prev,
          messages: [...messages, response.message, response.assistantResponse],
        };
      });

      setMessage('');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatMetadata = (metadata?: AnalysisMessageMetadata): string | null => {
    if (!metadata) return null;
    const parts: string[] = [];
    if (metadata.model) parts.push(`Model: ${metadata.model}`);
    if (metadata.totalTokens) parts.push(`Tokens: ${metadata.totalTokens}`);
    if (metadata.latencyMs) parts.push(`Latency: ${metadata.latencyMs}ms`);
    return parts.join(' | ');
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-mono uppercase tracking-wider text-sm">
            Loading Session...
          </p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-red-400 font-mono text-lg mb-4">
            {error || 'Session not found'}
          </p>
          <button
            onClick={handleBack}
            className="
              px-6 py-3 font-mono font-semibold uppercase tracking-wider text-sm
              bg-slate-800 hover:bg-slate-700 border border-slate-600
              text-slate-300 transition-all
            "
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  const messages = session.messages || [];

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="
              p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700
              text-slate-400 hover:text-slate-200 transition-all
            "
            title="Back to Sessions"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-mono font-bold text-emerald-400 truncate">
              {session.title}
            </h1>
            <p className="text-slate-500 font-mono text-xs">
              Session ID: {session.id.slice(0, 8)}... | {messages.length} messages
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Bot className="w-16 h-16 text-emerald-500/30 mx-auto mb-4" />
              <h3 className="text-lg font-mono text-emerald-400 mb-2">
                Start Your Analysis
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Ask questions about your metrics data. The AI will help you analyze patterns, identify anomalies, and provide insights.
              </p>
              <div className="space-y-2 text-left">
                <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">
                  Example questions:
                </p>
                <button
                  onClick={() => setMessage('What are the token usage trends for the past week?')}
                  className="
                    block w-full p-3 text-left
                    bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/30
                    text-slate-300 text-sm transition-all
                  "
                >
                  "What are the token usage trends for the past week?"
                </button>
                <button
                  onClick={() => setMessage('Which tenants have the highest error rates?')}
                  className="
                    block w-full p-3 text-left
                    bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/30
                    text-slate-300 text-sm transition-all
                  "
                >
                  "Which tenants have the highest error rates?"
                </button>
                <button
                  onClick={() => setMessage('Are there any anomalies in the recent data?')}
                  className="
                    block w-full p-3 text-left
                    bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/30
                    text-slate-300 text-sm transition-all
                  "
                >
                  "Are there any anomalies in the recent data?"
                </button>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const metadata = formatMetadata(msg.metadata);

            return (
              <div
                key={msg.id || index}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] p-4
                    ${isUser
                      ? 'bg-slate-800 border border-slate-700'
                      : 'bg-emerald-950/30 border border-emerald-500/30'
                    }
                  `}
                >
                  {/* Message Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`
                      p-1 rounded
                      ${isUser ? 'bg-slate-700' : 'bg-emerald-600/20'}
                    `}>
                      {isUser ? (
                        <User className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Bot className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <span className={`
                      font-mono text-xs uppercase tracking-wider
                      ${isUser ? 'text-slate-400' : 'text-emerald-400'}
                    `}>
                      {isUser ? 'You' : 'AI Assistant'}
                    </span>
                    <span className="text-slate-600 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>

                  {/* Message Content */}
                  {isUser ? (
                    <div className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <MarkdownViewer content={msg.content} size="sm" className="text-slate-200" />
                  )}

                  {/* Metadata (for AI responses) */}
                  {!isUser && metadata && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Coins className="w-3 h-3" />
                        <span>{metadata}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Sending indicator */}
        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 bg-emerald-950/30 border border-emerald-500/30">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-emerald-400 font-mono text-sm">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/50">
        <form onSubmit={handleSend} className="space-y-3">
          {/* Include Metrics Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetrics}
                onChange={(e) => setIncludeMetrics(e.target.checked)}
                className="
                  w-4 h-4 bg-slate-900 border-2 border-slate-700
                  checked:bg-cyan-600 checked:border-cyan-500
                  focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                  transition-all cursor-pointer
                "
              />
              <span className="flex items-center gap-1 text-slate-400 text-sm">
                <ChartBar className="w-4 h-4 text-cyan-400" />
                Include Current Metrics
              </span>
            </label>
            {includeMetrics && (
              <span className="text-cyan-400/60 text-xs font-mono">
                (Real-time metrics will be sent to AI)
              </span>
            )}
          </div>

          {/* Message Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about your metrics data..."
              disabled={sending}
              className="
                flex-1 px-4 py-3 font-mono text-sm
                bg-slate-900 border border-slate-700
                text-slate-100 placeholder-slate-500
                focus:outline-none focus:border-emerald-500/50 focus:shadow-lg focus:shadow-emerald-500/10
                transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="
                px-6 py-3 font-mono font-semibold uppercase tracking-wider text-sm
                bg-emerald-600 hover:bg-emerald-700 border border-emerald-500
                text-white transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg shadow-emerald-500/20
                flex items-center gap-2
              "
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
