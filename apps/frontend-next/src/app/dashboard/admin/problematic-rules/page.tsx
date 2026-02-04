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
  CopyPlus,
  Minus,
} from 'lucide-react';
import {
  ProblematicChatRule,
  CreateProblematicChatRuleRequest,
  UpdateProblematicChatRuleRequest,
  RULE_FIELDS,
  getOperatorsForField,
  getFieldDefinition,
  getOperatorDefinition,
  RuleOperatorDefinition,
  isCompoundConfig,
  SingleCondition,
  CompoundRuleConfig,
  SimpleRuleConfig,
  normalizeToCompound,
} from '@ola/shared-types';
import {
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRuleEnabled,
} from '@/services/problematicChatService';

interface ConditionFormData {
  field: string;
  operator: string;
  numericValue: number;
  stringValue: string;
  stringArrayValue: string;
  booleanValue: boolean;
}

interface RuleFormData {
  name: string;
  description: string;
  isCompound: boolean;
  // 단순 규칙 (기존 필드들 유지)
  field: string;
  operator: string;
  numericValue: number;
  stringValue: string;
  stringArrayValue: string; // 쉼표 구분
  booleanValue: boolean;
  // 복합 규칙
  conditions: ConditionFormData[];
  logic: 'AND' | 'OR';
}

const createDefaultCondition = (): ConditionFormData => ({
  field: RULE_FIELDS[0].field,
  operator: getOperatorsForField(RULE_FIELDS[0].field)[0]?.operator || '',
  numericValue: 0,
  stringValue: '',
  stringArrayValue: '',
  booleanValue: false,
});

const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  isCompound: false,
  field: RULE_FIELDS[0].field,
  operator: '',
  numericValue: 1500,
  stringValue: '',
  stringArrayValue: '',
  booleanValue: false,
  conditions: [],
  logic: 'AND',
};

/** 필드의 dataType에 따른 뱃지 색상 */
function getFieldColor(fieldKey: string): string {
  const def = getFieldDefinition(fieldKey);
  if (!def) return 'bg-slate-600/20 text-slate-400';
  switch (def.dataType) {
    case 'numeric': return 'bg-amber-600/20 text-amber-400';
    case 'text': return 'bg-rose-600/20 text-rose-400';
    case 'boolean': return 'bg-cyan-600/20 text-cyan-400';
    default: return 'bg-slate-600/20 text-slate-400';
  }
}

/** 규칙 config를 사람이 읽기 쉬운 요약으로 변환 */
function formatRuleSummary(config: ProblematicChatRule['config']): string {
  if (isCompoundConfig(config)) {
    // TODO(human): 복합 규칙 요약을 사람이 읽기 쉽게 표현하세요
    // config.logic ('AND' | 'OR'), config.conditions (SingleCondition[])을 활용합니다
    // 예: "(응답 글자수 >= 10) AND (한글 비율 < 0.3)" 또는 "2개 조건 (AND)" 등
    return `${config.conditions.length}개 조건 (${config.logic})`;
  }
  // 기존 단순 규칙 로직 유지
  const fieldDef = getFieldDefinition(config.field);
  const opDef = getOperatorDefinition(config.operator);
  if (!fieldDef || !opDef) return `${config.field} ${config.operator} ${config.value}`;

  if (Array.isArray(config.value)) {
    return `${config.value.slice(0, 3).join(', ')}${config.value.length > 3 ? ` +${config.value.length - 3}개` : ''}`;
  }

  return `${opDef.label} ${config.value}`;
}

export default function ProblematicRulesPage() {
  const [rules, setRules] = useState<ProblematicChatRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProblematicChatRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [availableOperators, setAvailableOperators] = useState<RuleOperatorDefinition[]>([]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  // 필드 변경 시 사용 가능한 연산자 업데이트 (단순 규칙 모드에서만)
  useEffect(() => {
    if (formData.isCompound) return;
    const ops = getOperatorsForField(formData.field);
    setAvailableOperators(ops);
    // 현재 operator가 유효하지 않으면 첫 번째로 변경
    if (ops.length > 0 && !ops.find((o) => o.operator === formData.operator)) {
      setFormData((prev) => ({ ...prev, operator: ops[0].operator }));
    }
  }, [formData.field, formData.isCompound]);

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

  const handleOpenCreate = () => {
    setEditingRule(null);
    const firstField = RULE_FIELDS[0].field;
    const ops = getOperatorsForField(firstField);
    setFormData({
      ...defaultFormData,
      field: firstField,
      operator: ops[0]?.operator || '',
      isCompound: false,
      conditions: [],
      logic: 'AND',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: ProblematicChatRule) => {
    setEditingRule(rule);

    if (isCompoundConfig(rule.config)) {
      const conditions: ConditionFormData[] = rule.config.conditions.map((c) => {
        const opDef = getOperatorDefinition(c.operator);
        return {
          field: c.field,
          operator: c.operator,
          numericValue: opDef?.valueType === 'number' ? Number(c.value) : 0,
          stringValue: opDef?.valueType === 'string' ? String(c.value) : '',
          stringArrayValue: opDef?.valueType === 'string_array' && Array.isArray(c.value) ? c.value.join(', ') : '',
          booleanValue: opDef?.valueType === 'boolean' ? Boolean(c.value) : false,
        };
      });
      setFormData({
        ...defaultFormData,
        name: rule.name,
        description: rule.description || '',
        isCompound: true,
        conditions,
        logic: rule.config.logic,
      });
    } else {
      // 기존 단순 규칙 로직 유지
      const opDef = getOperatorDefinition(rule.config.operator);
      setFormData({
        ...defaultFormData,
        name: rule.name,
        description: rule.description || '',
        isCompound: false,
        field: rule.config.field,
        operator: rule.config.operator,
        numericValue: opDef?.valueType === 'number' ? Number(rule.config.value) : 1500,
        stringValue: opDef?.valueType === 'string' ? String(rule.config.value) : '',
        stringArrayValue: opDef?.valueType === 'string_array' && Array.isArray(rule.config.value)
          ? rule.config.value.join(', ')
          : '',
        booleanValue: opDef?.valueType === 'boolean' ? Boolean(rule.config.value) : false,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setFormData(defaultFormData);
  };

  /** 현재 연산자의 valueType에 맞게 config.value를 추출 (단순 규칙용) */
  const getConfigValue = (): number | string | boolean | string[] => {
    const opDef = getOperatorDefinition(formData.operator);
    if (!opDef) return formData.numericValue;

    switch (opDef.valueType) {
      case 'number': return formData.numericValue;
      case 'string': return formData.stringValue;
      case 'string_array':
        return formData.stringArrayValue
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s);
      case 'boolean': return formData.booleanValue;
      default: return formData.numericValue;
    }
  };

  /** 각 조건의 value를 추출 (복합 규칙용) */
  const getConditionValue = (cond: ConditionFormData): number | string | boolean | string[] => {
    const opDef = getOperatorDefinition(cond.operator);
    if (!opDef) return cond.numericValue;
    switch (opDef.valueType) {
      case 'number': return cond.numericValue;
      case 'string': return cond.stringValue;
      case 'string_array':
        return cond.stringArrayValue.split(',').map(s => s.trim()).filter(s => s);
      case 'boolean': return cond.booleanValue;
      default: return cond.numericValue;
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('규칙 이름을 입력하세요.');
      return;
    }

    try {
      setSaving(true);

      let config: SimpleRuleConfig | CompoundRuleConfig;

      if (formData.isCompound) {
        if (formData.conditions.length < 2) {
          alert('복합 규칙은 최소 2개 조건이 필요합니다.');
          setSaving(false);
          return;
        }
        config = {
          version: 2,
          logic: formData.logic,
          conditions: formData.conditions.map(c => ({
            field: c.field,
            operator: c.operator,
            value: getConditionValue(c),
          })),
        };
      } else {
        config = {
          field: formData.field,
          operator: formData.operator,
          value: getConfigValue(),
        };
      }

      if (editingRule) {
        const updateData: UpdateProblematicChatRuleRequest = {
          name: formData.name,
          description: formData.description || undefined,
          config,
        };
        await updateRule(editingRule.id, updateData);
      } else {
        const createData: CreateProblematicChatRuleRequest = {
          name: formData.name,
          description: formData.description || undefined,
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

  const handleToggle = async (rule: ProblematicChatRule) => {
    try {
      await toggleRuleEnabled(rule.id, !rule.isEnabled);
      await loadRules();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle rule');
    }
  };

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
            BigQuery 필드와 연산자를 조합하여 문제 채팅을 필터링합니다
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
              <th className="px-6 py-4">필드</th>
              <th className="px-6 py-4">조건</th>
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
                    {isCompoundConfig(rule.config) ? (
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-600/20 text-purple-400">
                          {rule.config.logic}
                        </span>
                        {rule.config.conditions.map((c, i) => {
                          const fd = getFieldDefinition(c.field);
                          return (
                            <span key={i} className={`px-2 py-1 rounded text-xs font-medium ${getFieldColor(c.field)}`}>
                              {fd?.label || c.field}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getFieldColor(rule.config.field)}`}>
                        {getFieldDefinition(rule.config.field)?.label || rule.config.field}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">
                    {isCompoundConfig(rule.config) ? (
                      <span>{formatRuleSummary(rule.config)}</span>
                    ) : (
                      <>
                        {Array.isArray(rule.config.value) ? (
                          <span className="flex flex-wrap gap-1">
                            {(rule.config.value as string[]).slice(0, 3).map((v, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">
                                {v}
                              </span>
                            ))}
                            {(rule.config.value as string[]).length > 3 && (
                              <span className="text-slate-400">
                                +{(rule.config.value as string[]).length - 3}개
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>{formatRuleSummary(rule.config)}</span>
                        )}
                      </>
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
          <div className="relative bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl">
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
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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

              {/* 규칙 모드 토글 */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                <span className="text-sm text-slate-400">규칙 유형:</span>
                <button
                  type="button"
                  onClick={() => {
                    const newIsCompound = !formData.isCompound;
                    setFormData(prev => ({
                      ...prev,
                      isCompound: newIsCompound,
                      conditions: newIsCompound && prev.conditions.length === 0
                        ? [createDefaultCondition(), createDefaultCondition()]
                        : prev.conditions,
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.isCompound
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {formData.isCompound ? '복합 규칙 (다중 조건)' : '단순 규칙'}
                </button>
              </div>

              {formData.isCompound ? (
                <div className="space-y-3">
                  {/* Logic selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">로직:</span>
                    {(['AND', 'OR'] as const).map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logic: l }))}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          formData.logic === l
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* Conditions */}
                  {formData.conditions.map((cond, idx) => {
                    const condOps = getOperatorsForField(cond.field);
                    const condOpDef = getOperatorDefinition(cond.operator);
                    return (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900/70 border border-slate-700/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">조건 {idx + 1}</span>
                          {formData.conditions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  conditions: prev.conditions.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-rose-400 transition-colors"
                              title="조건 삭제"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {/* Field selector */}
                        <select
                          value={cond.field}
                          onChange={(e) => {
                            const newField = e.target.value;
                            const newOps = getOperatorsForField(newField);
                            setFormData(prev => ({
                              ...prev,
                              conditions: prev.conditions.map((c, i) => i === idx
                                ? { ...c, field: newField, operator: newOps[0]?.operator || '' }
                                : c),
                            }));
                          }}
                          className="w-full px-3 py-1.5 rounded bg-slate-800 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
                        >
                          {RULE_FIELDS.map(f => (
                            <option key={f.field} value={f.field}>{f.label} ({f.dataType})</option>
                          ))}
                        </select>
                        {/* Operator selector */}
                        <select
                          value={cond.operator}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              conditions: prev.conditions.map((c, i) => i === idx
                                ? { ...c, operator: e.target.value }
                                : c),
                            }));
                          }}
                          className="w-full px-3 py-1.5 rounded bg-slate-800 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
                        >
                          {condOps.map(op => (
                            <option key={op.operator} value={op.operator}>{op.label}</option>
                          ))}
                        </select>
                        {/* Value input based on valueType */}
                        {condOpDef?.valueType === 'number' && (
                          <input
                            type="number"
                            value={cond.numericValue}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                conditions: prev.conditions.map((c, i) => i === idx
                                  ? { ...c, numericValue: parseFloat(e.target.value) || 0 }
                                  : c),
                              }));
                            }}
                            className="w-full px-3 py-1.5 rounded bg-slate-800 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
                            step="any"
                          />
                        )}
                        {condOpDef?.valueType === 'string' && (
                          <input
                            type="text"
                            value={cond.stringValue}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                conditions: prev.conditions.map((c, i) => i === idx
                                  ? { ...c, stringValue: e.target.value }
                                  : c),
                              }));
                            }}
                            className="w-full px-3 py-1.5 rounded bg-slate-800 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
                            placeholder="검색할 텍스트"
                          />
                        )}
                        {condOpDef?.valueType === 'string_array' && (
                          <textarea
                            value={cond.stringArrayValue}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                conditions: prev.conditions.map((c, i) => i === idx
                                  ? { ...c, stringArrayValue: e.target.value }
                                  : c),
                              }));
                            }}
                            className="w-full px-3 py-1.5 rounded bg-slate-800 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none resize-none"
                            rows={2}
                            placeholder="키워드1, 키워드2, ..."
                          />
                        )}
                        {condOpDef?.valueType === 'boolean' && (
                          <select
                            value={cond.booleanValue ? 'true' : 'false'}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                conditions: prev.conditions.map((c, i) => i === idx
                                  ? { ...c, booleanValue: e.target.value === 'true' }
                                  : c),
                              }));
                            }}
                            className="w-full px-3 py-1.5 rounded bg-slate-800 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
                          >
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        )}
                        {/* AND/OR separator between conditions */}
                        {idx < formData.conditions.length - 1 && (
                          <div className="flex items-center justify-center pt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              formData.logic === 'AND' ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-600/20 text-amber-400'
                            }`}>
                              {formData.logic}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add condition button */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        conditions: [...prev.conditions, createDefaultCondition()],
                      }));
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-sm"
                  >
                    <CopyPlus className="w-4 h-4" />
                    조건 추가
                  </button>
                </div>
              ) : (
                <>
                  {/* Field Selector (단순 규칙) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">대상 필드 *</label>
                    <select
                      value={formData.field}
                      onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                    >
                      {RULE_FIELDS.map((f) => (
                        <option key={f.field} value={f.field}>
                          {f.label} ({f.dataType})
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const fd = getFieldDefinition(formData.field);
                      return fd?.description ? (
                        <p className="mt-1 text-xs text-slate-500">{fd.description}</p>
                      ) : null;
                    })()}
                  </div>

                  {/* Operator Selector (단순 규칙) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">연산자 *</label>
                    <select
                      value={formData.operator}
                      onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                    >
                      {availableOperators.map((op) => (
                        <option key={op.operator} value={op.operator}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Value Input (단순 규칙) */}
                  {(() => {
                    const opDef = getOperatorDefinition(formData.operator);
                    if (!opDef) return null;

                    switch (opDef.valueType) {
                      case 'number':
                        return (
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">값 *</label>
                            <input
                              type="number"
                              value={formData.numericValue}
                              onChange={(e) =>
                                setFormData({ ...formData, numericValue: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                              step="any"
                            />
                          </div>
                        );
                      case 'string':
                        return (
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">값 *</label>
                            <input
                              type="text"
                              value={formData.stringValue}
                              onChange={(e) => setFormData({ ...formData, stringValue: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                              placeholder="검색할 텍스트"
                            />
                          </div>
                        );
                      case 'string_array':
                        return (
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              키워드 (쉼표로 구분) *
                            </label>
                            <textarea
                              value={formData.stringArrayValue}
                              onChange={(e) => setFormData({ ...formData, stringArrayValue: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none resize-none"
                              rows={3}
                              placeholder="예: 죄송합니다, 데이터 없습니다, 찾을 수 없습니다"
                            />
                          </div>
                        );
                      case 'boolean':
                        return (
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">값 *</label>
                            <select
                              value={formData.booleanValue ? 'true' : 'false'}
                              onChange={(e) =>
                                setFormData({ ...formData, booleanValue: e.target.value === 'true' })
                              }
                              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                            >
                              <option value="true">True (성공)</option>
                              <option value="false">False (실패)</option>
                            </select>
                          </div>
                        );
                      default:
                        return null;
                    }
                  })()}
                </>
              )}

              {/* Preview */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">규칙 미리보기</p>
                {formData.isCompound ? (
                  <div className="space-y-1">
                    {formData.conditions.map((cond, idx) => {
                      const condOpDef = getOperatorDefinition(cond.operator);
                      const condFieldDef = getFieldDefinition(cond.field);
                      const val = getConditionValue(cond);
                      return (
                        <div key={idx}>
                          <p className="text-sm text-slate-300">
                            <span className="text-blue-400">{condFieldDef?.label}</span>
                            {' '}
                            <span className="text-amber-400">{condOpDef?.label}</span>
                            {' '}
                            <span className="text-green-400">
                              {Array.isArray(val) ? val.join(', ') : String(val)}
                            </span>
                          </p>
                          {idx < formData.conditions.length - 1 && (
                            <p className="text-xs text-center text-purple-400 font-bold">{formData.logic}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300">
                    <span className="text-blue-400">{getFieldDefinition(formData.field)?.label}</span>
                    {' '}
                    <span className="text-amber-400">{getOperatorDefinition(formData.operator)?.label}</span>
                    {' '}
                    <span className="text-green-400">
                      {(() => {
                        const v = getConfigValue();
                        return Array.isArray(v) ? v.join(', ') : String(v);
                      })()}
                    </span>
                  </p>
                )}
              </div>
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
