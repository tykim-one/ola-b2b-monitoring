'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Bot,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  sessionAnalysisApi,
  SessionTimeline,
  LLMSessionAnalysis,
} from '@/services/sessionAnalysisService';

interface SessionTimelineModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionTimelineModal({
  sessionId,
  isOpen,
  onClose,
}: SessionTimelineModalProps) {
  const [timeline, setTimeline] = useState<SessionTimeline | null>(null);
  const [llmAnalysis, setLlmAnalysis] = useState<LLMSessionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchTimeline();
    }
  }, [isOpen, sessionId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sessionAnalysisApi.getTimeline(sessionId);
      setTimeline(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load session timeline');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeWithLLM = async () => {
    try {
      setAnalyzing(true);
      const result = await sessionAnalysisApi.analyzeWithLLM(sessionId);
      setLlmAnalysis(result);
    } catch (err: any) {
      alert(err.message || 'Failed to analyze with LLM');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Session Timeline
            </h2>
            <p className="text-slate-400 font-mono text-xs mt-1">
              ID: {sessionId.slice(0, 20)}...
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 font-mono text-sm">Loading timeline...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-950/30 border border-red-500/30 p-4 rounded">
              <p className="text-red-400 font-mono text-sm">{error}</p>
            </div>
          ) : timeline ? (
            <div className="space-y-6">
              {/* Session Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 p-3 rounded">
                  <p className="text-slate-500 text-xs font-mono uppercase">Tenant</p>
                  <p className="text-slate-200 font-mono mt-1">{timeline.tenantId}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 p-3 rounded">
                  <p className="text-slate-500 text-xs font-mono uppercase">Turns</p>
                  <p className="text-slate-200 font-mono mt-1">{timeline.turns.length}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 p-3 rounded">
                  <p className="text-slate-500 text-xs font-mono uppercase">Resolution</p>
                  <div className="flex items-center gap-2 mt-1">
                    {timeline.analysis?.isResolved ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-mono">Resolved</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 font-mono">Unresolved</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 p-3 rounded">
                  <p className="text-slate-500 text-xs font-mono uppercase">Frustration</p>
                  <div className="flex items-center gap-2 mt-1">
                    {timeline.analysis?.hasFrustration ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-mono">Detected</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400 font-mono">None</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* LLM Analysis Button & Results */}
              <div className="bg-slate-800/30 border border-slate-700 p-4 rounded">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-violet-400 font-mono font-bold text-sm uppercase">
                      LLM Deep Analysis
                    </span>
                  </div>
                  <button
                    onClick={handleAnalyzeWithLLM}
                    disabled={analyzing}
                    className="
                      flex items-center gap-2 px-3 py-1.5
                      bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800
                      text-white font-mono text-sm font-bold uppercase
                      rounded transition-colors
                    "
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Analyze
                      </>
                    )}
                  </button>
                </div>

                {llmAnalysis && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-slate-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-500 text-xs font-mono">Resolution</p>
                        <p className={`font-mono ${llmAnalysis.isResolved ? 'text-green-400' : 'text-red-400'}`}>
                          {llmAnalysis.isResolved ? 'Resolved' : 'Unresolved'}
                          {llmAnalysis.resolutionTurn && ` (Turn ${llmAnalysis.resolutionTurn})`}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs font-mono">Quality Score</p>
                        <p className="font-mono text-cyan-400">{llmAnalysis.qualityScore}/10</p>
                      </div>
                    </div>
                    {llmAnalysis.abandonmentReason && (
                      <div>
                        <p className="text-slate-500 text-xs font-mono">Abandonment Reason</p>
                        <p className="font-mono text-amber-400">{llmAnalysis.abandonmentReason}</p>
                      </div>
                    )}
                    {llmAnalysis.summary && (
                      <div>
                        <p className="text-slate-500 text-xs font-mono">Summary</p>
                        <p className="font-mono text-slate-300">{llmAnalysis.summary}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Conversation Timeline */}
              <div>
                <h3 className="text-slate-300 font-mono font-bold text-sm uppercase mb-4">
                  Conversation
                </h3>
                <div className="space-y-4">
                  {timeline.turns.map((turn, index) => (
                    <div key={index} className="space-y-3">
                      {/* User Message */}
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-blue-400 font-mono text-xs font-bold">USER</span>
                            <span className="text-slate-500 font-mono text-xs">
                              {formatTime(turn.timestamp)}
                            </span>
                            <span className="text-slate-600 font-mono text-xs">
                              Turn {index + 1}
                            </span>
                          </div>
                          <div className="bg-blue-950/30 border border-blue-500/20 p-3 rounded-lg">
                            <p className="text-slate-200 text-sm whitespace-pre-wrap">
                              {turn.userInput}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bot Response */}
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-emerald-400 font-mono text-xs font-bold">BOT</span>
                            {turn.success ? (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-400" />
                            )}
                            <span className="text-slate-600 font-mono text-xs">
                              {turn.inputTokens + turn.outputTokens} tokens
                            </span>
                          </div>
                          <div className="bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-lg">
                            <p className="text-slate-200 text-sm whitespace-pre-wrap">
                              {turn.llmResponse}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="
              px-4 py-2 bg-slate-800 hover:bg-slate-700
              text-slate-300 font-mono text-sm font-bold uppercase
              border border-slate-600 rounded transition-colors
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
