'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Star,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import {
  batchAnalysisApi,
  AnalysisPromptTemplate,
} from '@/services/batchAnalysisService';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function PromptsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AnalysisPromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<AnalysisPromptTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await batchAnalysisApi.listPromptTemplates();
      setTemplates(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormPrompt(DEFAULT_PROMPT);
    setFormIsDefault(false);
  };

  const handleEdit = (template: AnalysisPromptTemplate) => {
    setEditingId(template.id);
    setIsCreating(false);
    setFormName(template.name);
    setFormDescription(template.description || '');
    setFormPrompt(template.prompt);
    setFormIsDefault(template.isDefault);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormPrompt('');
    setFormIsDefault(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrompt.trim()) return;

    try {
      setFormSubmitting(true);
      if (isCreating) {
        await batchAnalysisApi.createPromptTemplate({
          name: formName,
          description: formDescription || undefined,
          prompt: formPrompt,
          isDefault: formIsDefault,
        });
      } else if (editingId) {
        await batchAnalysisApi.updatePromptTemplate(editingId, {
          name: formName,
          description: formDescription || undefined,
          prompt: formPrompt,
          isDefault: formIsDefault,
        });
      }
      handleCancel();
      await fetchTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteClick = (template: AnalysisPromptTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    try {
      setIsDeleting(true);
      await batchAnalysisApi.deletePromptTemplate(templateToDelete.id);
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
      await fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-mono uppercase tracking-wider text-sm">
            Loading Templates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <button
          onClick={() => router.push('/dashboard/admin/batch-analysis')}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 font-mono text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Batch Analysis
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
              Prompt Templates
            </h1>
            <p className="text-slate-400 font-mono text-sm">
              Manage analysis prompt templates for batch jobs
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating || editingId !== null}
            className="
              flex items-center gap-2 px-6 py-3
              bg-cyan-600 hover:bg-cyan-700 border-2 border-cyan-500
              text-white font-mono font-bold uppercase tracking-wider text-sm
              transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40
              disabled:opacity-50
            "
          >
            <Plus className="w-5 h-5" />
            New Template
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border-2 border-red-500/50 bg-red-950/30">
          <p className="text-red-400 font-mono text-sm">ERROR: {error}</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="mb-8 border-2 border-cyan-500/30 bg-slate-900/50 p-6">
          <h2 className="text-lg font-mono font-bold text-cyan-400 uppercase tracking-wider mb-4">
            {isCreating ? 'Create Template' : 'Edit Template'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="
                    w-full px-4 py-3 bg-slate-800 border border-slate-700
                    text-slate-100 font-mono text-sm
                    focus:outline-none focus:border-cyan-500 transition-colors
                  "
                  placeholder="Template name"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="
                    w-full px-4 py-3 bg-slate-800 border border-slate-700
                    text-slate-100 font-mono text-sm
                    focus:outline-none focus:border-cyan-500 transition-colors
                  "
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Required Output Format Guide */}
            <div className="p-4 bg-amber-950/20 border-2 border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-amber-400 font-mono font-bold text-sm uppercase tracking-wider mb-2">
                    필수 출력 형식
                  </h4>
                  <p className="text-slate-400 font-mono text-xs mb-3">
                    모든 프롬프트는 아래 JSON 필드를 포함하는 응답을 반환해야 합니다. 이 형식을 따라야 점수 집계 및 분석이 가능합니다.
                  </p>
                  <pre className="text-slate-300 font-mono text-xs bg-slate-900/50 p-3 border border-slate-700 overflow-x-auto">
{`{
  "quality_score": (1-10),
  "relevance": (1-10),
  "completeness": (1-10),
  "clarity": (1-10),
  "issues": ["..."],
  "improvements": ["..."],
  "sentiment": "positive|neutral|negative",
  "summary": "..."
}`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      setFormPrompt((prev) => prev + '\n\n' + REQUIRED_OUTPUT_FORMAT);
                    }}
                    className="
                      mt-3 flex items-center gap-2 px-3 py-1.5
                      bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50
                      text-amber-300 font-mono text-xs uppercase tracking-wider
                      transition-colors
                    "
                  >
                    <Copy className="w-3 h-3" />
                    프롬프트에 삽입
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                Prompt Template *
                <span className="text-slate-500 ml-2 normal-case">
                  (Use &#123;&#123;user_input&#125;&#125; and &#123;&#123;llm_response&#125;&#125; as variables)
                </span>
              </label>
              <textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                required
                rows={12}
                className="
                  w-full px-4 py-3 bg-slate-800 border border-slate-700
                  text-slate-100 font-mono text-sm
                  focus:outline-none focus:border-cyan-500 transition-colors resize-y
                "
                placeholder="Enter your prompt template..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="w-4 h-4 bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="isDefault" className="text-slate-300 font-mono text-sm">
                Set as default template
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCancel}
                className="
                  px-6 py-3 bg-slate-800 border border-slate-700
                  text-slate-300 font-mono font-bold uppercase tracking-wider text-sm
                  hover:bg-slate-700 transition-colors
                "
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="
                  flex items-center gap-2 px-6 py-3
                  bg-cyan-600 hover:bg-cyan-700 border-2 border-cyan-500
                  text-white font-mono font-bold uppercase tracking-wider text-sm
                  transition-all disabled:opacity-50
                "
              >
                {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCreating ? 'Create' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-4">
        {templates.length === 0 ? (
          <div className="border-2 border-slate-800 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-500 font-mono text-sm">NO TEMPLATES FOUND</p>
            <p className="text-slate-600 font-mono text-xs mt-2">
              Create a template to customize analysis prompts
            </p>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="border-2 border-slate-800 bg-slate-900/50 hover:bg-slate-900/70 transition-colors"
            >
              <div className="p-4 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-mono font-bold text-slate-200">
                      {template.name}
                    </h3>
                    {template.isDefault && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-amber-950/30 border border-amber-500/30 text-amber-400 font-mono text-xs uppercase tracking-wider">
                        <Star className="w-3 h-3" />
                        Default
                      </span>
                    )}
                    {!template.isActive && (
                      <span className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-500 font-mono text-xs uppercase tracking-wider">
                        Inactive
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-slate-400 font-mono text-sm mb-2">
                      {template.description}
                    </p>
                  )}
                  <p className="text-slate-500 font-mono text-xs">
                    Created: {new Date(template.createdAt).toLocaleDateString()}
                    {template.updatedAt !== template.createdAt && (
                      <span className="ml-4">
                        Updated: {new Date(template.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(template)}
                    disabled={isCreating || editingId !== null}
                    className="
                      p-2 bg-slate-800 hover:bg-cyan-600/20 border border-slate-700 hover:border-cyan-500/50
                      text-slate-400 hover:text-cyan-400 transition-all disabled:opacity-50
                    "
                    title="Edit Template"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(template)}
                    disabled={isCreating || editingId !== null}
                    className="
                      p-2 bg-slate-800 hover:bg-red-600/20 border border-slate-700 hover:border-red-500/50
                      text-slate-400 hover:text-red-400 transition-all disabled:opacity-50
                    "
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="p-3 bg-slate-950 border border-slate-800 max-h-32 overflow-y-auto">
                  <pre className="text-slate-400 font-mono text-xs whitespace-pre-wrap">
                    {template.prompt.slice(0, 500)}
                    {template.prompt.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message={`Are you sure you want to delete "${templateToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

// 필수 출력 포맷 (모든 프롬프트가 반환해야 하는 JSON 구조)
const REQUIRED_OUTPUT_FORMAT = `## 필수 출력 형식

다음 JSON 형식으로 응답해주세요:
{
  "quality_score": (1-10 점수),
  "relevance": (질문에 대한 응답 관련성 1-10),
  "completeness": (응답의 완성도 1-10),
  "clarity": (응답의 명확성 1-10),
  "issues": ["발견된 문제점 목록"],
  "improvements": ["개선 제안 목록"],
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "한 줄 요약"
}`;

const DEFAULT_PROMPT = `당신은 대화 품질 분석 전문가입니다. 다음 고객-AI 대화를 분석하고 JSON 형식으로 응답해주세요.

## 분석 대상 대화

**사용자 질문:**
{{user_input}}

**AI 응답:**
{{llm_response}}

## 분석 항목

다음 JSON 형식으로 응답해주세요:
{
  "quality_score": (1-10 점수),
  "relevance": (질문에 대한 응답 관련성 1-10),
  "completeness": (응답의 완성도 1-10),
  "clarity": (응답의 명확성 1-10),
  "issues": ["발견된 문제점 목록"],
  "improvements": ["개선 제안 목록"],
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "한 줄 요약"
}`;
