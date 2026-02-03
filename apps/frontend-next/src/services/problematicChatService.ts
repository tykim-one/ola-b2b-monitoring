import {
  ProblematicChatRule,
  ProblematicChat,
  ProblematicChatStats,
  ProblematicChatFilter,
  CreateProblematicChatRuleRequest,
  UpdateProblematicChatRuleRequest,
} from '@ola/shared-types';
import apiClient from '@/lib/api-client';

const BASE_URL = '/api/problematic-chat';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
}

// ==================== 규칙 API ====================

/**
 * 모든 규칙 조회
 */
export async function fetchRules(): Promise<ProblematicChatRule[]> {
  const response = await apiClient.get<ApiResponse<ProblematicChatRule[]>>(`${BASE_URL}/rules`);
  return response.data.data;
}

/**
 * 규칙 생성
 */
export async function createRule(
  data: CreateProblematicChatRuleRequest
): Promise<ProblematicChatRule> {
  const response = await apiClient.post<ApiResponse<ProblematicChatRule>>(`${BASE_URL}/rules`, data);
  return response.data.data;
}

/**
 * 규칙 수정
 */
export async function updateRule(
  id: string,
  data: UpdateProblematicChatRuleRequest
): Promise<ProblematicChatRule> {
  const response = await apiClient.put<ApiResponse<ProblematicChatRule>>(`${BASE_URL}/rules/${id}`, data);
  return response.data.data;
}

/**
 * 규칙 삭제
 */
export async function deleteRule(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/rules/${id}`);
}

/**
 * 규칙 활성화/비활성화 토글
 */
export async function toggleRuleEnabled(
  id: string,
  isEnabled: boolean
): Promise<ProblematicChatRule> {
  return updateRule(id, { isEnabled });
}

// ==================== 문제 채팅 조회 API ====================

/**
 * 문제 채팅 목록 조회
 */
export async function fetchProblematicChats(
  filter: ProblematicChatFilter
): Promise<ProblematicChat[]> {
  const params = new URLSearchParams();
  if (filter.days) params.set('days', String(filter.days));
  if (filter.limit) params.set('limit', String(filter.limit));
  if (filter.offset) params.set('offset', String(filter.offset));
  if (filter.userId) params.set('userId', filter.userId);
  if (filter.tenantId) params.set('tenantId', filter.tenantId);
  if (filter.ruleIds && filter.ruleIds.length > 0) {
    params.set('ruleIds', filter.ruleIds.join(','));
  }

  const response = await apiClient.get<ApiResponse<ProblematicChat[]>>(`${BASE_URL}/chats?${params.toString()}`);
  return response.data.data;
}

/**
 * 문제 채팅 통계 조회
 */
export async function fetchProblematicChatStats(
  days: number = 7,
  tenantId?: string
): Promise<ProblematicChatStats> {
  const params = new URLSearchParams();
  params.set('days', String(days));
  if (tenantId) params.set('tenantId', tenantId);

  const response = await apiClient.get<ApiResponse<ProblematicChatStats>>(`${BASE_URL}/stats?${params.toString()}`);
  return response.data.data;
}
