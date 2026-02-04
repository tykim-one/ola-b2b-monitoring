'use client';

import React, { useState } from 'react';
import { Plus, Trash2, MessageSquare, Bot, Clock, Calendar } from 'lucide-react';
import { AnalysisSession } from '@ola/shared-types';
import { useAnalysisSessions, useDeleteAnalysisSession } from '@/hooks/queries';
import SearchInput from '@/components/ui/SearchInput';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import NewSessionModal from './components/NewSessionModal';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsFooter } from '@/components/ui/StatsFooter';

export default function AnalysisPage() {
  const router = useRouter();
  const { data: sessions = [], isLoading, error } = useAnalysisSessions();
  const deleteSession = useDeleteAnalysisSession();

  const [searchQuery, setSearchQuery] = useState('');
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<AnalysisSession | null>(null);

  const handleCreateSession = () => {
    setIsNewSessionOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, session: AnalysisSession) => {
    e.stopPropagation();
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!sessionToDelete) return;
    deleteSession.mutate(sessionToDelete.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSessionToDelete(null);
      },
      onError: (err: Error) => {
        alert(err.message || 'Failed to delete session');
      },
    });
  };

  const handleSessionCreated = (session: AnalysisSession) => {
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            Loading Sessions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Analysis
            </h1>
            <p className="text-gray-500 text-sm">
              {sessions.length}개의 분석 세션이 있습니다
            </p>
          </div>
          <button
            onClick={handleCreateSession}
            className="
              flex items-center gap-2 px-6 py-3
              bg-emerald-600 hover:bg-emerald-700 border-2 border-emerald-500
              text-white font-medium text-sm
              transition-all shadow-sm
            "
          >
            <Plus className="w-5 h-5" />
            New Session
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50">
          <p className="text-red-400 text-sm">ERROR: {(error as Error).message}</p>
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
          <EmptyState
            icon={<Bot className="w-12 h-12 text-gray-300" />}
            description="NO ANALYSIS SESSIONS YET"
            searchQuery={searchQuery}
            action={{ label: 'Start Your First Session', onClick: handleCreateSession }}
            className="col-span-full"
          />
        ) : (
          filteredSessions.map((session) => {
            const messageCount = getMessageCount(session);
            return (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className="
                  border border-gray-200 bg-gray-50
                  hover:border-emerald-500/30 hover:bg-gray-50
                  transition-all cursor-pointer group
                "
              >
                {/* Card Header */}
                <div className="p-5 border-b border-gray-200 bg-gray-50/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600/20 border border-emerald-500/30">
                        <Bot className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-emerald-300 transition-colors">
                          {session.title}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteClick(e, session)}
                      className="
                        p-2 bg-white hover:bg-red-600/20 border border-gray-200 hover:border-red-500/50
                        text-gray-500 hover:text-red-400 transition-all
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
                      <span className="text-gray-600 text-sm">
                        {messageCount} {messageCount === 1 ? 'message' : 'messages'}
                      </span>
                    </div>
                  </div>

                  {/* Context Preview */}
                  {session.context?.metricsSnapshot && (
                    <div className="p-3 bg-gray-50/50 border border-gray-200 mb-4">
                      <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                        Metrics Snapshot Attached
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/30">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400">
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
      <StatsFooter
        className="mt-8"
        items={[
          { label: 'Total Sessions', value: sessions.length, color: 'text-emerald-400' },
          { label: 'Total Messages', value: sessions.reduce((acc, s) => acc + getMessageCount(s), 0), color: 'text-cyan-400' },
          { label: 'Avg Messages/Session', value: sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + getMessageCount(s), 0) / sessions.length) : 0, color: 'text-gray-500' },
        ]}
      />

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
        isLoading={deleteSession.isPending}
      />
    </div>
  );
}
