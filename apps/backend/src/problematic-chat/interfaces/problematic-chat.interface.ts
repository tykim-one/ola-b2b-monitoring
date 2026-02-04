/**
 * 문제 채팅 모니터링 인터페이스
 */

import { ProblematicChatRuleConfig } from '@ola/shared-types';

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
  nextUserInput?: string;
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
