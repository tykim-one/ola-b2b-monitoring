'use client';

import React, { useState } from 'react';
import { AnalysisSession, CreateSessionRequest } from '@ola/shared-types';
import { analysisApi } from '@/lib/api-client';
import Modal from '@/components/ui/Modal';

interface NewSessionModalProps {
  onClose: () => void;
  onSuccess: (session: AnalysisSession) => void;
}

export default function NewSessionModal({ onClose, onSuccess }: NewSessionModalProps) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Session title is required');
      return;
    }

    try {
      setLoading(true);

      const createData: CreateSessionRequest = {
        title: title.trim(),
      };

      const newSession = await analysisApi.createSession(createData);
      onSuccess(newSession);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Start New Analysis Session"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 border-2 border-red-500/50 bg-red-950/30">
            <p className="text-red-400 font-mono text-sm">ERROR: {error}</p>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block mb-2 font-mono text-sm font-bold text-emerald-400 uppercase tracking-wider">
            Session Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="
              w-full px-4 py-3 font-mono text-sm
              bg-slate-900 border border-slate-700
              text-slate-100 placeholder-slate-500
              focus:outline-none focus:border-emerald-500/50 focus:shadow-lg focus:shadow-emerald-500/10
              transition-all
            "
            placeholder="e.g., Analyze Token Usage Patterns"
          />
          <p className="mt-2 text-slate-500 text-xs">
            Give your session a descriptive title to easily identify it later.
          </p>
        </div>

        {/* Info */}
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/30">
          <p className="text-emerald-400 font-mono text-xs uppercase tracking-wider mb-2">
            What is AI Analysis?
          </p>
          <p className="text-slate-300 text-sm leading-relaxed">
            Start a conversation with AI to analyze your metrics data. You can ask questions about usage patterns,
            identify anomalies, and get insights about your B2B monitoring data.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              px-6 py-3 font-mono font-semibold uppercase tracking-wider text-sm
              bg-slate-800 hover:bg-slate-700 border border-slate-600
              text-slate-300 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="
              px-6 py-3 font-mono font-semibold uppercase tracking-wider text-sm
              bg-emerald-600 hover:bg-emerald-700 border border-emerald-500
              text-white transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-emerald-500/20
            "
          >
            {loading ? 'Creating...' : 'Start Session'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
