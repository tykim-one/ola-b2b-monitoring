'use client';

import { AnalysisSession } from '@ola/shared-types';
import { useState } from 'react';

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
    <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white mb-4">AI Analysis</h1>
        <button
          onClick={onCreateSession}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] disabled:scale-100"
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
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-slate-400 text-sm">No sessions yet</p>
            <p className="text-slate-600 text-xs mt-2">Create a new session to start chatting</p>
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
                      : 'bg-slate-800 hover:bg-slate-700'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3
                        className={`
                          text-sm font-semibold truncate
                          ${isActive ? 'text-white' : 'text-slate-200'}
                        `}
                      >
                        {session.title}
                      </h3>
                      <p
                        className={`
                          text-xs mt-1
                          ${isActive ? 'text-blue-100' : 'text-slate-500'}
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
                          ? 'bg-red-600 text-white'
                          : isActive
                          ? 'bg-white/20 hover:bg-white/30 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
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
                        ${isActive ? 'text-blue-100' : 'text-slate-600'}
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
