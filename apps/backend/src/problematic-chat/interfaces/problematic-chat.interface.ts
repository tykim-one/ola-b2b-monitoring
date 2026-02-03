/**
 * 문제 채팅 모니터링 인터페이스
 */

export type ProblematicChatRuleType = 'token_threshold' | 'keyword_match' | 'token_ratio';
export type TokenOperator = 'lt' | 'gt';
export type KeywordMatchField = 'llm_response' | 'user_input';

export interface ProblematicChatRuleConfig {
  threshold?: number;
  operator?: TokenOperator;
  keywords?: string[];
  matchField?: KeywordMatchField;
  minRatio?: number;
  maxRatio?: number;
}

export interface ProblematicChatRuleEntity {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  type: string;
  config: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedProblematicChatRule {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  type: ProblematicChatRuleType;
  config: ProblematicChatRuleConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ProblematicChatItem {
  id: string;
  timestamp: string;
  userId: string;
  tenantId: string;
  userInput: string;
  llmResponse: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  success: boolean;
  sessionId?: string;
  matchedRules: string[];
}

export interface ProblematicChatStats {
  totalCount: number;
  byRule: Array<{
    ruleId: string;
    ruleName: string;
    count: number;
    percentage: number;
  }>;
  byTenant: Array<{
    tenantId: string;
    count: number;
  }>;
}
