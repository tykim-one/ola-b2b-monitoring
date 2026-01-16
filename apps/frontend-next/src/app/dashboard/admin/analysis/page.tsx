'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MessageSquare, Bot, Clock, Calendar } from 'lucide-react';
import { AnalysisSession } from '@ola/shared-types';
import { analysisApi } from '@/lib/api-client';
import SearchInput from '@/components/ui/SearchInput';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import NewSessionModal from './components/NewSessionModal';
import { useRouter } from 'next/navigation';

export default function AnalysisPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<AnalysisSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await analysisApi.getSessions();
      setSessions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = () => {
    setIsNewSessionOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, session: AnalysisSession) => {
    e.stopPropagation();
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;

    try {
      setIsDeleting(true);
      await analysisApi.deleteSession(sessionToDelete.id);
      setSessions(sessions.filter((s) => s.id !== sessionToDelete.id));
      setIsDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete session');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSessionCreated = (session: AnalysisSession) => {
    setSessions([session, ...sessions]);
    setIsNewSessionOpen(false);
    // Navigate to the chat interface
    router.push(`/dashboard/admin/analysis/${session.id}`);
  };

  const handleSessionClick = (session: AnalysisSession) => {
    router.push(`/dashboard/admin/analysis/${session.id}`);
  };

  const filteredSessions = sessions.filter((session) => {
    const query = searchQuery.toLowerCase();
    return session.title.toLowerCase().includes(query);
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageCount = (session: AnalysisSession): number => {
    return session.messages?.length || 0;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-mono uppercase tracking-wider text-sm">
            Loading Sessions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-mono font-bold text-emerald-400 uppercase tracking-wider mb-2">
              AI Analysis
            </h1>
            <p className="text-slate-400 font-mono text-sm">
              SYSTEM.ADMIN.ANALYSIS // {sessions.length} SESSIONS
            </p>
          </div>
          <button
            onClick={handleCreateSession}
            className="
              flex items-center gap-2 px-6 py-3
              bg-emerald-600 hover:bg-emerald-700 border-2 border-emerald-500
              text-white font-mono font-bold uppercase tracking-wider text-sm
              transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40
            "
          >
            <Plus className="w-5 h-5" />
            New Session
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border-2 border-red-500/50 bg-red-950/30">
          <p className="text-red-400 font-mono text-sm">ERROR: {error}</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="SEARCH BY SESSION TITLE..."
          className="max-w-2xl"
        />
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSessions.length === 0 ? (
          <div className="col-span-full p-12 border-2 border-dashed border-slate-800 bg-slate-900/30 text-center">
            <Bot className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-mono text-sm">
              {searchQuery ? 'NO RESULTS FOUND' : 'NO ANALYSIS SESSIONS YET'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateSession}
                className="
                  mt-4 px-4 py-2
                  bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50
                  text-emerald-400 font-mono text-sm uppercase tracking-wider
                  transition-all
                "
              >
                Start Your First Session
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const messageCount = getMessageCount(session);
            return (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className="
                  border-2 border-slate-800 bg-slate-900/50
                  hover:border-emerald-500/30 hover:bg-slate-900/70
                  transition-all cursor-pointer group
                "
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-800 bg-slate-950/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600/20 border border-emerald-500/30">
                        <Bot className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-mono font-bold text-emerald-400 truncate group-hover:text-emerald-300 transition-colors">
                          {session.title}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteClick(e, session)}
                      className="
                        p-2 bg-slate-800 hover:bg-red-600/20 border border-slate-700 hover:border-red-500/50
                        text-slate-400 hover:text-red-400 transition-all
                        opacity-0 group-hover:opacity-100
                      "
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-300 font-mono text-sm">
                        {messageCount} {messageCount === 1 ? 'message' : 'messages'}
                      </span>
                    </div>
                  </div>

                  {/* Context Preview */}
                  {session.context?.metricsSnapshot && (
                    <div className="p-3 bg-slate-800/50 border border-slate-700 mb-4">
                      <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                        Metrics Snapshot Attached
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/30">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(session.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(session.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Total Sessions
          </p>
          <p className="text-emerald-400 font-mono text-2xl font-bold">{sessions.length}</p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Total Messages
          </p>
          <p className="text-cyan-400 font-mono text-2xl font-bold">
            {sessions.reduce((acc, s) => acc + getMessageCount(s), 0)}
          </p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Avg Messages/Session
          </p>
          <p className="text-slate-400 font-mono text-2xl font-bold">
            {sessions.length > 0
              ? Math.round(sessions.reduce((acc, s) => acc + getMessageCount(s), 0) / sessions.length)
              : 0}
          </p>
        </div>
      </div>

      {/* New Session Modal */}
      {isNewSessionOpen && (
        <NewSessionModal
          onClose={() => setIsNewSessionOpen(false)}
          onSuccess={handleSessionCreated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Session"
        message={
          sessionToDelete
            ? `Are you sure you want to delete session "${sessionToDelete.title}"? All messages will be permanently lost. This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
