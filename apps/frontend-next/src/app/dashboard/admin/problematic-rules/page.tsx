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
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
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
  fetchRulePreviewQuery,
} from '@/services/problematicChatService';
import Modal from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

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
  if (!def) return 'bg-gray-100 text-gray-500';
  switch (def.dataType) {
    case 'numeric': return 'bg-amber-600/20 text-amber-400';
    case 'text': return 'bg-rose-600/20 text-rose-400';
    case 'boolean': return 'bg-cyan-600/20 text-cyan-400';
    default: return 'bg-gray-100 text-gray-500';
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

  const [detailRule, setDetailRule] = useState<ProblematicChatRule | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleOpenDetail = (rule: ProblematicChatRule) => {
    setDetailRule(rule);
    setSqlQuery(null);
    setShowSQL(false);
    setCopied(false);
  };

  const handleCloseDetail = () => {
    setDetailRule(null);
    setSqlQuery(null);
    setShowSQL(false);
    setCopied(false);
  };

  const handleToggleSQL = async () => {
    if (!showSQL && !sqlQuery && detailRule) {
      setSqlLoading(true);
      try {
        const result = await fetchRulePreviewQuery(detailRule.id);
        setSqlQuery(result.query);
      } catch {
        setSqlQuery('-- SQL 쿼리를 불러올 수 없습니다');
      } finally {
        setSqlLoading(false);
      }
    }
    setShowSQL(!showSQL);
  };

  const handleCopySQL = async () => {
    if (sqlQuery) {
      await navigator.clipboard.writeText(sqlQuery);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            문제 채팅 필터링 규칙
          </h2>
          <p className="text-gray-500 mt-1">
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
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-400 mb-6">
          오류: {error}
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
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
                <td colSpan={6} className="px-6 py-12">
                  <EmptyState
                    variant="compact"
                    description="등록된 규칙이 없습니다."
                    action={{ label: '새 규칙 추가', onClick: handleOpenCreate }}
                  />
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-gray-100 hover:bg-gray-100/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`transition-colors ${
                        rule.isEnabled ? 'text-green-400' : 'text-gray-400'
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
                  <td className="px-6 py-4 text-gray-900 font-medium">{rule.name}</td>
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
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {isCompoundConfig(rule.config) ? (
                      <span>{formatRuleSummary(rule.config)}</span>
                    ) : (
                      <>
                        {Array.isArray(rule.config.value) ? (
                          <span className="flex flex-wrap gap-1">
                            {(rule.config.value as string[]).slice(0, 3).map((v, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                {v}
                              </span>
                            ))}
                            {(rule.config.value as string[]).length > 3 && (
                              <span className="text-gray-500">
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
                  <td className="px-6 py-4 text-gray-500 text-sm max-w-[200px] truncate">
                    {rule.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenDetail(rule)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-blue-600 text-gray-600 hover:text-gray-900 transition-colors"
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(rule)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
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
                            className="px-2 py-1 rounded bg-gray-300 hover:bg-gray-300 text-gray-900 text-xs"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(rule.id)}
                          className="p-2 rounded-lg bg-gray-100 hover:bg-rose-600 text-gray-600 hover:text-gray-900 transition-colors"
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

      {/* Detail Dialog */}
      {detailRule && (
        <Modal
          isOpen={!!detailRule}
          onClose={handleCloseDetail}
          title="규칙 상세"
          size="lg"
        >
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              detailRule.isEnabled ? 'bg-green-600/20 text-green-400' : 'bg-gray-100 text-gray-500'
            }`}>
              {detailRule.isEnabled ? '활성' : '비활성'}
            </span>
          </div>

          {/* Meta Info */}
          <div className="space-y-3 mb-5">
            <div>
              <p className="text-xs text-gray-400 mb-1">규칙 이름</p>
              <p className="text-gray-900 font-medium text-lg">{detailRule.name}</p>
            </div>
            {detailRule.description && (
              <div>
                <p className="text-xs text-gray-400 mb-1">설명</p>
                <p className="text-gray-600">{detailRule.description}</p>
              </div>
            )}
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">생성일</p>
                <p className="text-gray-600">{new Date(detailRule.createdAt).toLocaleString('ko-KR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">수정일</p>
                <p className="text-gray-600">{new Date(detailRule.updatedAt).toLocaleString('ko-KR')}</p>
              </div>
            </div>
          </div>

          {/* Conditions Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-5">
            <p className="text-xs text-gray-400 mb-2">조건 설정</p>
            {isCompoundConfig(detailRule.config) ? (() => {
              const cc = detailRule.config;
              return (
              <div className="space-y-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-600/20 text-purple-400">
                  복합 규칙 ({cc.logic})
                </span>
                {cc.conditions.map((c, i) => {
                  const fd = getFieldDefinition(c.field);
                  const od = getOperatorDefinition(c.operator);
                  const val = Array.isArray(c.value) ? (c.value as string[]).join(', ') : String(c.value);
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {i > 0 && (
                        <span className="text-purple-400 text-xs font-bold">{cc.logic}</span>
                      )}
                      <span className="text-blue-400">{fd?.label || c.field}</span>
                      <span className="text-amber-400">{od?.label || c.operator}</span>
                      <span className="text-green-400 break-all">{val}</span>
                    </div>
                  );
                })}
              </div>
              );
            })() : (
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getFieldColor(detailRule.config.field)}`}>
                  {getFieldDefinition(detailRule.config.field)?.label || detailRule.config.field}
                </span>
                <span className="text-amber-400">{getOperatorDefinition(detailRule.config.operator)?.label || detailRule.config.operator}</span>
                <span className="text-green-400">
                  {Array.isArray(detailRule.config.value)
                    ? (detailRule.config.value as string[]).join(', ')
                    : String(detailRule.config.value)}
                </span>
              </div>
            )}
          </div>

          {/* SQL Preview - Collapsible */}
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={handleToggleSQL}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-white/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">SQL 쿼리 미리보기</span>
                {sqlLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                )}
              </div>
              {showSQL ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {showSQL && sqlQuery && (
              <div className="relative">
                <button
                  onClick={handleCopySQL}
                  className="absolute top-2 right-2 p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors z-10"
                  title="SQL 복사"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre className="p-4 bg-gray-50 text-sm text-gray-600 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {sqlQuery}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingRule ? '규칙 수정' : '새 규칙 추가'}
          size="md"
        >
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">규칙 이름 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:border-blue-500 focus:outline-none"
                placeholder="예: Output 토큰 부족"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">설명</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:border-blue-500 focus:outline-none"
                placeholder="예: Output 토큰이 1500 미만인 응답"
              />
            </div>

            {/* 규칙 모드 토글 */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-500">규칙 유형:</span>
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
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {formData.isCompound ? '복합 규칙 (다중 조건)' : '단순 규칙'}
              </button>
            </div>

            {formData.isCompound ? (
              <div className="space-y-3">
                {/* Logic selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">로직:</span>
                  {(['AND', 'OR'] as const).map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logic: l }))}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        formData.logic === l
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                    <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">조건 {idx + 1}</span>
                        {formData.conditions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                conditions: prev.conditions.filter((_, i) => i !== idx),
                              }));
                            }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-rose-400 transition-colors"
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
                        className="w-full px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-sm focus:border-blue-500 focus:outline-none"
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
                        className="w-full px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-sm focus:border-blue-500 focus:outline-none"
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
                          className="w-full px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-sm focus:border-blue-500 focus:outline-none"
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
                          className="w-full px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-sm focus:border-blue-500 focus:outline-none"
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
                          className="w-full px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-sm focus:border-blue-500 focus:outline-none resize-none"
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
                          className="w-full px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-sm focus:border-blue-500 focus:outline-none"
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
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors text-sm"
                >
                  <CopyPlus className="w-4 h-4" />
                  조건 추가
                </button>
              </div>
            ) : (
              <>
                {/* Field Selector (단순 규칙) */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">대상 필드 *</label>
                  <select
                    value={formData.field}
                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:border-blue-500 focus:outline-none"
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
                      <p className="mt-1 text-xs text-gray-400">{fd.description}</p>
                    ) : null;
                  })()}
                </div>

                {/* Operator Selector (단순 규칙) */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">연산자 *</label>
                  <select
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:border-blue-500 focus:outline-none"
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
                          <label className="block text-sm font-medium text-gray-500 mb-1">값 *</label>
                          <input
                            type="number"
                            value={formData.numericValue}
                            onChange={(e) =>
                              setFormData({ ...formData, numericValue: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:border-blue-500 focus:outline-none"
                            step="any"
                          />
                        </div>
                      );
                    case 'string':
                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">값 *</label>
                          <input
                            type="text"
                            value={formData.stringValue}
                            onChange={(e) => setFormData({ ...formData, stringValue: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:border-blue-500 focus:outline-none"
                            placeholder="검색할 텍스트"
                          />
                        </div>
                      );
                    case 'string_array':
                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            키워드 (쉼표로 구분) *
                          </label>
                          <textarea
                            value={formData.stringArrayValue}
                            onChange={(e) => setFormData({ ...formData, stringArrayValue: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:border-blue-500 focus:outline-none resize-none"
                            rows={3}
                            placeholder="예: 죄송합니다, 데이터 없습니다, 찾을 수 없습니다"
                          />
                        </div>
                      );
                    case 'boolean':
                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">값 *</label>
                          <select
                            value={formData.booleanValue ? 'true' : 'false'}
                            onChange={(e) =>
                              setFormData({ ...formData, booleanValue: e.target.value === 'true' })
                            }
                            className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:border-blue-500 focus:outline-none"
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
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">규칙 미리보기</p>
              {formData.isCompound ? (
                <div className="space-y-1">
                  {formData.conditions.map((cond, idx) => {
                    const condOpDef = getOperatorDefinition(cond.operator);
                    const condFieldDef = getFieldDefinition(cond.field);
                    const val = getConditionValue(cond);
                    return (
                      <div key={idx}>
                        <p className="text-sm text-gray-600">
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
                <p className="text-sm text-gray-600">
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

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 transition-colors"
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
        </Modal>
      )}
    </div>
  );
}
