'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';
import {
  batchAnalysisApi,
  AnalysisPromptTemplate,
} from '@/services/batchAnalysisService';

interface CreateJobModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateJobModal({ onClose, onSuccess }: CreateJobModalProps) {
  const [templates, setTemplates] = useState<AnalysisPromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [targetDate, setTargetDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  const [tenantId, setTenantId] = useState('');
  const [sampleSize, setSampleSize] = useState(100);
  const [promptTemplateId, setPromptTemplateId] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await batchAnalysisApi.listPromptTemplates();
      setTemplates(data);
      // Set default template if available
      const defaultTemplate = data.find((t) => t.isDefault);
      if (defaultTemplate) {
        setPromptTemplateId(defaultTemplate.id);
      }
    } catch (err: any) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      await batchAnalysisApi.createJob({
        targetDate,
        tenantId: tenantId || undefined,
        sampleSize,
        promptTemplateId: promptTemplateId || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white border border-gray-200 shadow-2xl shadow-cyan-500/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Create Analysis Job
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 border border-red-500/50 bg-red-50">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Target Date */}
          <div>
            <label className="block text-gray-600 text-xs mb-2">
              Target Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                className="
                  w-full px-4 py-3 bg-white border border-gray-200
                  text-gray-800 text-sm
                  focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500
                  transition-colors
                "
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="mt-1 text-gray-400 text-xs">
              Select the date to analyze (usually yesterday)
            </p>
          </div>

          {/* Tenant ID (Optional) */}
          <div>
            <label className="block text-gray-600 text-xs mb-2">
              Tenant ID (Optional)
            </label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="Leave empty for all tenants"
              className="
                w-full px-4 py-3 bg-white border border-gray-200
                text-gray-800 text-sm placeholder-gray-400
                focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500
                transition-colors
              "
            />
          </div>

          {/* Sample Size */}
          <div>
            <label className="block text-gray-600 text-xs mb-2">
              Sample Size per Tenant
            </label>
            <input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(Math.max(10, Math.min(500, parseInt(e.target.value) || 100)))}
              min={10}
              max={500}
              className="
                w-full px-4 py-3 bg-white border border-gray-200
                text-gray-800 text-sm
                focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500
                transition-colors
              "
            />
            <p className="mt-1 text-gray-400 text-xs">
              Number of random samples per tenant (10-500)
            </p>
          </div>

          {/* Prompt Template */}
          <div>
            <label className="block text-gray-600 text-xs mb-2">
              Prompt Template
            </label>
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                <span className="text-gray-400 text-sm">Loading templates...</span>
              </div>
            ) : (
              <select
                value={promptTemplateId}
                onChange={(e) => setPromptTemplateId(e.target.value)}
                className="
                  w-full px-4 py-3 bg-white border border-gray-200
                  text-gray-800 text-sm
                  focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500
                  transition-colors
                "
              >
                <option value="">Default Template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.isDefault && '(Default)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="
                px-6 py-3 bg-white border border-gray-200
                text-gray-600 font-medium text-sm
                hover:bg-gray-100 transition-colors
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="
                flex items-center gap-2 px-6 py-3
                bg-blue-600 hover:bg-blue-700 border border-blue-500
                text-white font-medium text-sm
                transition-all disabled:opacity-50
              "
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
