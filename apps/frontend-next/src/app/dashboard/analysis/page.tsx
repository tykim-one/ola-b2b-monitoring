'use client';

import { useState, useEffect } from 'react';
import { AnalysisSession, SendMessageRequest } from '@ola/shared-types';
import SessionList from '@/components/analysis/SessionList';
import ChatInterface from '@/components/analysis/ChatInterface';
import MetricsContext from '@/components/analysis/MetricsContext';
import {
  fetchSessions,
  createSession,
  fetchSessionWithMessages,
  deleteSession,
  sendMessage,
} from '@/services/analysisService';

export default function AnalysisPage() {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [activeSession, setActiveSession] = useState<AnalysisSession | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await fetchSessions();
      setSessions(data);

      // Auto-select most recent session
      if (data.length > 0 && !activeSession) {
        handleSelectSession(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const newSession = await createSession({
        title: `Analysis ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      });
      setSessions((prev) => [newSession, ...prev]);
      setActiveSession(newSession);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      const session = await fetchSessionWithMessages(sessionId);
      setActiveSession(session);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      // Clear active session if it was deleted
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        // Auto-select next session
        const remainingSessions = sessions.filter((s) => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          handleSelectSession(remainingSessions[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleSendMessage = async (request: SendMessageRequest) => {
    if (!activeSession) return;

    try {
      const response = await sendMessage(activeSession.id, request);

      // Update active session with new messages
      setActiveSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [
            ...(prev.messages || []),
            response.message,
            response.assistantResponse,
          ],
        };
      });

      // Update sessions list
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, updatedAt: new Date().toISOString() }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Left Sidebar: Session List */}
      <SessionList
        sessions={sessions}
        activeSessionId={activeSession?.id || null}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        loading={loading}
      />

      {/* Main Content: Chat Interface */}
      <ChatInterface
        session={activeSession}
        onSendMessage={handleSendMessage}
      />

      {/* Right Sidebar: Metrics Context (Optional) */}
      <MetricsContext
        isVisible={showMetrics}
        onToggle={() => setShowMetrics(!showMetrics)}
      />
    </div>
  );
}
