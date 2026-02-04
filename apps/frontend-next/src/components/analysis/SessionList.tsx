'use client';

import { AnalysisSession } from '@ola/shared-types';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';

interface SessionListProps {
  sessions: AnalysisSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  loading?: boolean;
}

export default function SessionList({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  loading = false,
}: SessionListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm === sessionId) {
      onDeleteSession(sessionId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sessionId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 mb-4">AI Analysis</h1>
        <button
          onClick={onCreateSession}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] disabled:scale-100"
        >
          + New Analysis Session
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <EmptyState
              icon={<span className="text-4xl">💬</span>}
              title="No sessions yet"
              description="Create a new session to start chatting"
            />
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isDeleting = deleteConfirm === session.id;

              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`
                    group relative p-3 rounded-lg cursor-pointer transition-all
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg'
                      : 'bg-white hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3
                        className={`
                          text-sm font-semibold truncate
                          ${isActive ? 'text-gray-900' : 'text-gray-700'}
                        `}
                      >
                        {session.title}
                      </h3>
                      <p
                        className={`
                          text-xs mt-1
                          ${isActive ? 'text-blue-100' : 'text-gray-400'}
                        `}
                      >
                        {formatDate(session.createdAt)}
                      </p>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className={`
                        opacity-0 group-hover:opacity-100 transition-opacity
                        px-2 py-1 rounded text-xs
                        ${isDeleting
                          ? 'bg-red-600 text-gray-900'
                          : isActive
                          ? 'bg-white/20 hover:bg-white/30 text-gray-900'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }
                      `}
                    >
                      {isDeleting ? 'Confirm?' : '✕'}
                    </button>
                  </div>

                  {/* Message Count */}
                  {session.messages && session.messages.length > 0 && (
                    <div
                      className={`
                        text-xs mt-2
                        ${isActive ? 'text-blue-100' : 'text-gray-400'}
                      `}
                    >
                      {session.messages.length} messages
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
