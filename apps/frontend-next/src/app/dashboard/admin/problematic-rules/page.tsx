'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  Hash,
  MessageSquare,
} from 'lucide-react';
import {
  ProblematicChatRule,
  CreateProblematicChatRuleRequest,
  UpdateProblematicChatRuleRequest,
  ProblematicChatRuleType,
  TokenOperator,
  KeywordMatchField,
} from '@ola/shared-types';
import {
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRuleEnabled,
} from '@/services/problematicChatService';

interface RuleFormData {
  name: string;
  description: string;
  type: ProblematicChatRuleType;
  threshold: number;
  operator: TokenOperator;
  keywords: string;
  matchField: KeywordMatchField;
  minRatio: number;
  maxRatio: number;
}

const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  type: 'token_threshold',
  threshold: 1500,
  operator: 'lt',
  keywords: '',
  matchField: 'llm_response',
  minRatio: 0.3,
  maxRatio: 5.0,
};

export default function ProblematicRulesPage() {
  const [rules, setRules] = useState<ProblematicChatRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProblematicChatRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  // 삭제 확인 상태
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 규칙 목록 로드
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await fetchRules();
      setRules(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  // 모달 열기 (생성)
  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  // 모달 열기 (수정)
  const handleOpenEdit = (rule: ProblematicChatRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      type: rule.type,
      threshold: rule.config.threshold || 1500,
      operator: rule.config.operator || 'lt',
      keywords: rule.config.keywords?.join(', ') || '',
      matchField: rule.config.matchField || 'llm_response',
      minRatio: rule.config.minRatio ?? 0.3,
      maxRatio: rule.config.maxRatio ?? 5.0,
    });
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setFormData(defaultFormData);
  };

  // 폼 저장
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('규칙 이름을 입력하세요.');
      return;
    }

    try {
      setSaving(true);

      let config;
      if (formData.type === 'token_threshold') {
        config = { threshold: formData.threshold, operator: formData.operator };
      } else if (formData.type === 'keyword_match') {
        config = {
          keywords: formData.keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k),
          matchField: formData.matchField,
        };
      } else {
        config = {
          minRatio: formData.minRatio || undefined,
          maxRatio: formData.maxRatio || undefined,
        };
      }

      if (editingRule) {
        // 수정
        const updateData: UpdateProblematicChatRuleRequest = {
          name: formData.name,
          description: formData.description || undefined,
          type: formData.type,
          config,
        };
        await updateRule(editingRule.id, updateData);
      } else {
        // 생성
        const createData: CreateProblematicChatRuleRequest = {
          name: formData.name,
          description: formData.description || undefined,
          type: formData.type,
          config,
        };
        await createRule(createData);
      }

      await loadRules();
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  // 활성화/비활성화 토글
  const handleToggle = async (rule: ProblematicChatRule) => {
    try {
      await toggleRuleEnabled(rule.id, !rule.isEnabled);
      await loadRules();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle rule');
    }
  };

  // 삭제
  const handleDelete = async (id: string) => {
    try {
      await deleteRule(id);
      setDeleteConfirmId(null);
      await loadRules();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            문제 채팅 필터링 규칙
          </h2>
          <p className="text-slate-400 mt-1">
            룰 기반으로 개선이 필요한 채팅을 필터링합니다
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
          새 규칙 추가
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400 mb-6">
          오류: {error}
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-700">
              <th className="px-6 py-4">상태</th>
              <th className="px-6 py-4">이름</th>
              <th className="px-6 py-4">타입</th>
              <th className="px-6 py-4">설정</th>
              <th className="px-6 py-4">설명</th>
              <th className="px-6 py-4">액션</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  등록된 규칙이 없습니다. 새 규칙을 추가하세요.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`transition-colors ${
                        rule.isEnabled ? 'text-green-400' : 'text-slate-500'
                      }`}
                      title={rule.isEnabled ? '활성화됨 (클릭하여 비활성화)' : '비활성화됨 (클릭하여 활성화)'}
                    >
                      {rule.isEnabled ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">{rule.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.type === 'token_threshold'
                          ? 'bg-amber-600/20 text-amber-400'
                          : rule.type === 'keyword_match'
                            ? 'bg-rose-600/20 text-rose-400'
                            : 'bg-cyan-600/20 text-cyan-400'
                      }`}
                    >
                      {rule.type === 'token_threshold' ? (
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          토큰 임계값
                        </span>
                      ) : rule.type === 'keyword_match' ? (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          키워드 매칭
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          토큰 비율
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">
                    {rule.type === 'token_threshold' ? (
                      <span>
                        Output {rule.config.operator === 'lt' ? '<' : '>'} {rule.config.threshold}
                      </span>
                    ) : rule.type === 'keyword_match' ? (
                      <span className="flex flex-wrap gap-1">
                        {rule.config.keywords?.slice(0, 3).map((kw, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">
                            {kw}
                          </span>
                        ))}
                        {(rule.config.keywords?.length || 0) > 3 && (
                          <span className="text-slate-400">
                            +{(rule.config.keywords?.length || 0) - 3}개
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>
                        비율: {rule.config.minRatio ?? '-'} ~ {rule.config.maxRatio ?? '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm max-w-[200px] truncate">
                    {rule.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(rule)}
                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteConfirmId === rule.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs"
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 text-white text-xs"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(rule.id)}
                          className="p-2 rounded-lg bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                {editingRule ? '규칙 수정' : '새 규칙 추가'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">규칙 이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="예: Output 토큰 부족"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">설명</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="예: Output 토큰이 1500 미만인 응답"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">규칙 타입 *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="token_threshold"
                      checked={formData.type === 'token_threshold'}
                      onChange={() => setFormData({ ...formData, type: 'token_threshold' })}
                      className="text-blue-500"
                    />
                    <span className="text-slate-300">토큰 임계값</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="keyword_match"
                      checked={formData.type === 'keyword_match'}
                      onChange={() => setFormData({ ...formData, type: 'keyword_match' })}
                      className="text-blue-500"
                    />
                    <span className="text-slate-300">키워드 매칭</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="token_ratio"
                      checked={formData.type === 'token_ratio'}
                      onChange={() => setFormData({ ...formData, type: 'token_ratio' })}
                      className="text-blue-500"
                    />
                    <span className="text-slate-300">토큰 비율</span>
                  </label>
                </div>
              </div>

              {/* Token Threshold Options */}
              {formData.type === 'token_threshold' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">연산자</label>
                    <select
                      value={formData.operator}
                      onChange={(e) =>
                        setFormData({ ...formData, operator: e.target.value as TokenOperator })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="lt">미만 (&lt;)</option>
                      <option value="gt">초과 (&gt;)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">임계값</label>
                    <input
                      type="number"
                      value={formData.threshold}
                      onChange={(e) =>
                        setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                      min={0}
                    />
                  </div>
                </div>
              )}

              {/* Token Ratio Options */}
              {formData.type === 'token_ratio' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    output/input 토큰 비율이 아래 범위를 벗어나면 문제로 탐지합니다.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">
                        최소 비율 (미만이면 문제)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.minRatio}
                        onChange={(e) =>
                          setFormData({ ...formData, minRatio: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                        placeholder="예: 0.3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">
                        최대 비율 (초과면 문제)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.maxRatio}
                        onChange={(e) =>
                          setFormData({ ...formData, maxRatio: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                        placeholder="예: 5.0"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    예: 최소 0.3, 최대 5.0 → 비율이 0.3 미만이거나 5.0 초과면 문제로 탐지
                  </p>
                </div>
              )}

              {/* Keyword Match Options */}
              {formData.type === 'keyword_match' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">검색 대상</label>
                    <select
                      value={formData.matchField}
                      onChange={(e) =>
                        setFormData({ ...formData, matchField: e.target.value as KeywordMatchField })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="llm_response">LLM 응답</option>
                      <option value="user_input">사용자 입력</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      키워드 (쉼표로 구분)
                    </label>
                    <textarea
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none resize-none"
                      rows={3}
                      placeholder="예: 죄송합니다, 데이터, 없습니다"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                disabled={saving}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                disabled={saving}
              >
                <Save className="w-4 h-4" />
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
