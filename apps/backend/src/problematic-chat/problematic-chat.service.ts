import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../admin/database/prisma.service';
import { CacheService, CacheTTL } from '../cache/cache.service';
import { METRICS_DATASOURCE } from '../datasource/interfaces';
import type { MetricsDataSource } from '../datasource/interfaces';
import {
  CreateRuleDto,
  UpdateRuleDto,
  ProblematicChatFilterDto,
  ProblematicChatStatsFilterDto,
} from './dto';
import {
  ParsedProblematicChatRule,
  ProblematicChatItem,
  ProblematicChatStats,
} from './interfaces/problematic-chat.interface';
import {
  RULE_FIELDS,
  RULE_OPERATORS,
  getFieldDefinition,
  getOperatorDefinition,
  isCompoundConfig,
} from '@ola/shared-types';
import type {
  ProblematicChatRuleConfig,
  CompoundRuleConfig,
  SingleCondition,
} from '@ola/shared-types';

@Injectable()
export class ProblematicChatService {
  private readonly logger = new Logger(ProblematicChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    @Inject(METRICS_DATASOURCE) private readonly dataSource: MetricsDataSource,
  ) {}

  // ==================== 규칙 CRUD ====================

  async getAllRules(): Promise<ParsedProblematicChatRule[]> {
    const cacheKey = 'problematic-chat:rules:all';
    const cached = this.cacheService.get<ParsedProblematicChatRule[]>(cacheKey);
    if (cached) return cached;

    const rules = await this.prisma.problematicChatRule.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const parsed = rules.map((rule) => this.parseRule(rule));
    this.cacheService.set(cacheKey, parsed, CacheTTL.MEDIUM);
    return parsed;
  }

  async getEnabledRules(): Promise<ParsedProblematicChatRule[]> {
    const cacheKey = 'problematic-chat:rules:enabled';
    const cached = this.cacheService.get<ParsedProblematicChatRule[]>(cacheKey);
    if (cached) return cached;

    const rules = await this.prisma.problematicChatRule.findMany({
      where: { isEnabled: true },
      orderBy: { createdAt: 'asc' },
    });

    const parsed = rules.map((rule) => this.parseRule(rule));
    this.cacheService.set(cacheKey, parsed, CacheTTL.MEDIUM);
    return parsed;
  }

  async getRuleById(id: string): Promise<ParsedProblematicChatRule> {
    const rule = await this.prisma.problematicChatRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Rule with id ${id} not found`);
    }

    return this.parseRule(rule);
  }

  async createRule(dto: CreateRuleDto): Promise<ParsedProblematicChatRule> {
    this.validateRuleConfig(dto.config);

    // Determine type for backward compatibility
    const typeValue = isCompoundConfig(dto.config)
      ? `compound_${dto.config.logic.toLowerCase()}`
      : dto.config.field;

    const rule = await this.prisma.problematicChatRule.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        isEnabled: dto.isEnabled ?? true,
        type: typeValue, // type 컬럼에 field 또는 compound 마커 저장 (하위호환)
        config: JSON.stringify(dto.config),
      },
    });

    this.invalidateRulesCache();
    this.logger.log(`Created problematic chat rule: ${rule.name} (${rule.id})`);
    return this.parseRule(rule);
  }

  async updateRule(
    id: string,
    dto: UpdateRuleDto,
  ): Promise<ParsedProblematicChatRule> {
    const existing = await this.prisma.problematicChatRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Rule with id ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isEnabled !== undefined) updateData.isEnabled = dto.isEnabled;
    if (dto.config !== undefined) {
      this.validateRuleConfig(dto.config);
      updateData.config = JSON.stringify(dto.config);
      // Determine type for backward compatibility
      updateData.type = isCompoundConfig(dto.config)
        ? `compound_${dto.config.logic.toLowerCase()}`
        : dto.config.field;
    }

    const updated = await this.prisma.problematicChatRule.update({
      where: { id },
      data: updateData,
    });

    this.invalidateRulesCache();
    this.logger.log(
      `Updated problematic chat rule: ${updated.name} (${updated.id})`,
    );
    return this.parseRule(updated);
  }

  async deleteRule(id: string): Promise<void> {
    const existing = await this.prisma.problematicChatRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Rule with id ${id} not found`);
    }

    await this.prisma.problematicChatRule.delete({
      where: { id },
    });

    this.invalidateRulesCache();
    this.logger.log(`Deleted problematic chat rule: ${existing.name} (${id})`);
  }

  // ==================== 문제 채팅 조회 ====================

  async getProblematicChats(
    filter: ProblematicChatFilterDto,
  ): Promise<ProblematicChatItem[]> {
    const days = filter.days || 7;
    const limit = filter.limit || 100;
    const offset = filter.offset || 0;

    const cacheKey = `problematic-chat:chats:${days}:${limit}:${offset}:${filter.userId || ''}:${filter.tenantId || ''}:${(filter.ruleIds || []).join(',')}`;
    const cached = this.cacheService.get<ProblematicChatItem[]>(cacheKey);
    if (cached) return cached;

    let rules = await this.getEnabledRules();

    if (filter.ruleIds && filter.ruleIds.length > 0) {
      rules = rules.filter((r) => filter.ruleIds!.includes(r.id));
    }

    if (rules.length === 0) {
      return [];
    }

    const chats = await this.queryProblematicChats(
      rules,
      days,
      limit,
      offset,
      filter.userId,
      filter.tenantId,
    );

    const result = chats.map((chat) => ({
      ...chat,
      matchedRules: this.getMatchedRuleNames(chat, rules),
    }));

    this.cacheService.set(cacheKey, result, CacheTTL.SHORT);
    return result;
  }

  async getProblematicChatStats(
    filter: ProblematicChatStatsFilterDto,
  ): Promise<ProblematicChatStats> {
    const days = filter.days || 7;
    const cacheKey = `problematic-chat:stats:${days}:${filter.tenantId || ''}`;
    const cached = this.cacheService.get<ProblematicChatStats>(cacheKey);
    if (cached) return cached;

    const rules = await this.getEnabledRules();
    if (rules.length === 0) {
      return { totalCount: 0, byRule: [], byTenant: [] };
    }

    const byRule: ProblematicChatStats['byRule'] = [];
    let totalCount = 0;

    for (const rule of rules) {
      const count = await this.countByRule(rule, days, filter.tenantId);
      totalCount += count;
      byRule.push({
        ruleId: rule.id,
        ruleName: rule.name,
        count,
        percentage: 0,
      });
    }

    if (totalCount > 0) {
      byRule.forEach((item) => {
        item.percentage = Math.round((item.count / totalCount) * 100 * 10) / 10;
      });
    }

    const byTenant = await this.countByTenant(rules, days, filter.tenantId);

    const stats: ProblematicChatStats = {
      totalCount,
      byRule: byRule.sort((a, b) => b.count - a.count),
      byTenant: byTenant.sort((a, b) => b.count - a.count),
    };

    this.cacheService.set(cacheKey, stats, CacheTTL.SHORT);
    return stats;
  }

  // ==================== Private Methods ====================

  private validateRuleConfig(config: ProblematicChatRuleConfig): void {
    // Compound config (v2)
    if (isCompoundConfig(config)) {
      if (!['AND', 'OR'].includes(config.logic)) {
        throw new BadRequestException(
          `Invalid logic operator: ${config.logic}. Must be AND or OR`,
        );
      }
      if (!config.conditions || config.conditions.length === 0) {
        throw new BadRequestException(
          'Compound rule must have at least one condition',
        );
      }

      // Validate each condition
      for (const cond of config.conditions) {
        this.validateSingleCondition(cond);
      }
      return;
    }

    // Simple config (v1)
    this.validateSingleCondition(config);
  }

  private validateSingleCondition(condition: SingleCondition): void {
    const fieldDef = getFieldDefinition(condition.field);
    if (!fieldDef) {
      throw new BadRequestException(
        `Invalid field: ${condition.field}. Allowed: ${RULE_FIELDS.map((f) => f.field).join(', ')}`,
      );
    }

    const opDef = getOperatorDefinition(condition.operator);
    if (!opDef) {
      throw new BadRequestException(
        `Invalid operator: ${condition.operator}. Allowed: ${RULE_OPERATORS.map((o) => o.operator).join(', ')}`,
      );
    }

    if (!opDef.applicableTo.includes(fieldDef.dataType)) {
      throw new BadRequestException(
        `Operator '${condition.operator}' cannot be applied to field '${condition.field}' (dataType: ${fieldDef.dataType})`,
      );
    }
  }

  private parseRule(rule: {
    id: string;
    name: string;
    description: string | null;
    isEnabled: boolean;
    type: string;
    config: string;
    createdAt: Date;
    updatedAt: Date;
  }): ParsedProblematicChatRule {
    const rawConfig = JSON.parse(rule.config);

    // 기존 형식 → 새 형식 마이그레이션
    const config = this.migrateConfig(rule.type, rawConfig);

    return {
      id: rule.id,
      name: rule.name,
      description: rule.description || undefined,
      isEnabled: rule.isEnabled,
      config,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  /**
   * 기존 config 형식을 새 {field, operator, value} 형식으로 변환.
   * 이미 새 형식이면 그대로 반환.
   */
  private migrateConfig(
    type: string,
    rawConfig: Record<string, unknown>,
  ): ProblematicChatRuleConfig {
    // compound config (version 2) 확인
    if (
      rawConfig.version === 2 &&
      rawConfig.logic &&
      Array.isArray(rawConfig.conditions)
    ) {
      return rawConfig as unknown as ProblematicChatRuleConfig;
    }

    // 새 형식인지 확인
    if (
      rawConfig.field &&
      rawConfig.operator &&
      rawConfig.value !== undefined
    ) {
      return rawConfig as unknown as ProblematicChatRuleConfig;
    }

    // 기존 형식 → 새 형식 변환
    if (type === 'token_threshold') {
      return {
        field: 'output_tokens',
        operator: (rawConfig.operator as string) || 'lt',
        value: (rawConfig.threshold as number) || 1500,
      };
    }

    if (type === 'keyword_match') {
      return {
        field: (rawConfig.matchField as string) || 'llm_response',
        operator: 'contains_any',
        value: (rawConfig.keywords as string[]) || [],
      };
    }

    if (type === 'token_ratio') {
      // token_ratio의 경우 minRatio만 사용 (복잡한 or 조건은 lt로 변환)
      if (rawConfig.minRatio !== undefined) {
        return {
          field: 'token_ratio',
          operator: 'lt',
          value: rawConfig.minRatio as number,
        };
      }
      if (rawConfig.maxRatio !== undefined) {
        return {
          field: 'token_ratio',
          operator: 'gt',
          value: rawConfig.maxRatio as number,
        };
      }
    }

    // 알 수 없는 형식 — 기본값
    return { field: 'output_tokens', operator: 'lt', value: 1500 };
  }

  private invalidateRulesCache(): void {
    this.cacheService.del('problematic-chat:rules:all');
    this.cacheService.del('problematic-chat:rules:enabled');
    this.cacheService.delByPattern('problematic-chat:chats');
    this.cacheService.delByPattern('problematic-chat:stats');
  }

  // ==================== 동적 SQL 생성 엔진 ====================

  private buildWhereConditions(
    rules: ParsedProblematicChatRule[],
    useCTEAlias: boolean = false,
  ): string[] {
    const conditions: string[] = [];

    for (const rule of rules) {
      const config = rule.config;
      const condition = isCompoundConfig(config)
        ? this.buildCompoundCondition(config, useCTEAlias)
        : this.buildSingleCondition(config, useCTEAlias);
      if (condition) {
        conditions.push(condition);
      }
    }

    return conditions;
  }

  private buildSingleCondition(
    config: SingleCondition,
    useCTEAlias: boolean = false,
  ): string | null {
    const fieldDef = getFieldDefinition(config.field);
    const opDef = getOperatorDefinition(config.operator);

    if (!fieldDef || !opDef) {
      this.logger.warn(
        `Unknown field or operator: ${config.field} ${config.operator}`,
      );
      return null;
    }

    // CTE 모드에서 requiresCTE 필드는 CTE 별칭(필드명)을 사용
    const sqlField =
      useCTEAlias && fieldDef.requiresCTE
        ? config.field
        : fieldDef.sqlExpression;

    // contains_any: 특수 처리 (여러 키워드 OR)
    if (config.operator === 'contains_any' && Array.isArray(config.value)) {
      if (config.value.length === 0) return null;
      const keywordConditions = config.value.map(
        (kw) =>
          `LOWER(${sqlField}) LIKE LOWER('%${this.escapeForLike(String(kw))}%')`,
      );
      return `(${keywordConditions.join(' OR ')})`;
    }

    // not_contains_any: 키워드 모두 미포함 (AND)
    if (config.operator === 'not_contains_any' && Array.isArray(config.value)) {
      if (config.value.length === 0) return null;
      const keywordConditions = config.value.map(
        (kw) =>
          `LOWER(${sqlField}) NOT LIKE LOWER('%${this.escapeForLike(String(kw))}%')`,
      );
      return `(${keywordConditions.join(' AND ')})`;
    }

    // contains / not_contains: 문자열
    if (config.operator === 'contains' || config.operator === 'not_contains') {
      const escaped = this.escapeForLike(String(config.value));
      return this.applySqlTemplate(opDef.sqlTemplate, sqlField, escaped);
    }

    // boolean 필드: eq/neq
    if (fieldDef.dataType === 'boolean') {
      const boolVal =
        config.value === true || config.value === 'true' ? 'TRUE' : 'FALSE';
      return this.applySqlTemplate(opDef.sqlTemplate, sqlField, boolVal);
    }

    // numeric 필드: lt/lte/gt/gte/eq/neq
    if (fieldDef.dataType === 'numeric') {
      const numVal = Number(config.value);
      if (isNaN(numVal)) {
        this.logger.warn(
          `Non-numeric value for numeric field: ${config.field} = ${config.value}`,
        );
        return null;
      }
      return this.applySqlTemplate(opDef.sqlTemplate, sqlField, String(numVal));
    }

    return null;
  }

  private buildCompoundCondition(
    config: CompoundRuleConfig,
    useCTEAlias: boolean = false,
  ): string | null {
    const subconditions = config.conditions
      .map((cond) => this.buildSingleCondition(cond, useCTEAlias))
      .filter((c): c is string => c !== null);

    if (subconditions.length === 0) return null;
    if (subconditions.length === 1) return subconditions[0];

    const joiner = config.logic === 'AND' ? ' AND ' : ' OR ';
    return `(${subconditions.join(joiner)})`;
  }

  private escapeForLike(str: string): string {
    return str.replace(/'/g, "''").replace(/%/g, '\\\\%').replace(/_/g, '\\\\_');
  }

  /**
   * sqlTemplate의 {field}, {value} 플레이스홀더를 안전하게 치환.
   * 함수형 replacement를 사용하여 $' $& 등 JS replace() 특수 패턴 해석을 방지.
   */
  private applySqlTemplate(
    template: string,
    field: string,
    value: string,
  ): string {
    return template
      .replace('{field}', () => field)
      .replace('{value}', () => value);
  }

  // ==================== 클라이언트 사이드 매칭 ====================

  private getMatchedRuleNames(
    chat: Omit<ProblematicChatItem, 'matchedRules'>,
    rules: ParsedProblematicChatRule[],
  ): string[] {
    const matched: string[] = [];

    for (const rule of rules) {
      if (this.doesChatMatchRule(chat, rule.config)) {
        matched.push(rule.name);
      }
    }

    return matched;
  }

  private doesChatMatchRule(
    chat: Omit<ProblematicChatItem, 'matchedRules'>,
    config: ProblematicChatRuleConfig,
  ): boolean {
    if (isCompoundConfig(config)) {
      const results = config.conditions.map((cond) =>
        this.doesChatMatchSingleCondition(chat, cond),
      );
      return config.logic === 'AND'
        ? results.every(Boolean)
        : results.some(Boolean);
    }
    return this.doesChatMatchSingleCondition(chat, config);
  }

  private doesChatMatchSingleCondition(
    chat: Omit<ProblematicChatItem, 'matchedRules'>,
    config: SingleCondition,
  ): boolean {
    const chatValue = this.getChatFieldValue(chat, config.field);
    if (chatValue === null) return false;

    const fieldDef = getFieldDefinition(config.field);
    if (!fieldDef) return false;

    // text 필드 매칭
    if (fieldDef.dataType === 'text') {
      const textVal = String(chatValue).toLowerCase();
      if (config.operator === 'contains') {
        return textVal.includes(String(config.value).toLowerCase());
      }
      if (config.operator === 'not_contains') {
        return !textVal.includes(String(config.value).toLowerCase());
      }
      if (config.operator === 'contains_any' && Array.isArray(config.value)) {
        return config.value.some((kw) =>
          textVal.includes(String(kw).toLowerCase()),
        );
      }
      if (
        config.operator === 'not_contains_any' &&
        Array.isArray(config.value)
      ) {
        return !config.value.some((kw) =>
          textVal.includes(String(kw).toLowerCase()),
        );
      }
      return false;
    }

    // boolean 필드 매칭
    if (fieldDef.dataType === 'boolean') {
      const boolVal = chatValue === true;
      const targetVal = config.value === true || config.value === 'true';
      if (config.operator === 'eq') return boolVal === targetVal;
      if (config.operator === 'neq') return boolVal !== targetVal;
      return false;
    }

    // numeric 필드 매칭
    if (fieldDef.dataType === 'numeric') {
      const numVal = Number(chatValue);
      const targetVal = Number(config.value);
      if (isNaN(numVal) || isNaN(targetVal)) return false;

      switch (config.operator) {
        case 'lt':
          return numVal < targetVal;
        case 'lte':
          return numVal <= targetVal;
        case 'gt':
          return numVal > targetVal;
        case 'gte':
          return numVal >= targetVal;
        case 'eq':
          return numVal === targetVal;
        case 'neq':
          return numVal !== targetVal;
        default:
          return false;
      }
    }

    return false;
  }

  private getChatFieldValue(
    chat: Omit<ProblematicChatItem, 'matchedRules'>,
    field: string,
  ): number | string | boolean | null {
    switch (field) {
      case 'output_tokens':
        return chat.outputTokens;
      case 'input_tokens':
        return chat.inputTokens;
      case 'total_tokens':
        return chat.totalTokens;
      case 'token_ratio':
        return chat.inputTokens > 0 ? chat.outputTokens / chat.inputTokens : 0;
      case 'llm_response':
        return chat.llmResponse;
      case 'user_input':
        return chat.userInput;
      case 'success':
        return chat.success;
      case 'response_length':
        return chat.llmResponse?.length || 0;
      case 'korean_ratio': {
        const text = (chat.llmResponse || '').replace(/\s/g, '');
        if (!text) return 0;
        const korean = text.replace(/[^가-힣]/g, '').length;
        return korean / text.length;
      }
      case 'response_ends_complete': {
        const trimmed = (chat.llmResponse || '').trim();
        return /(?:습니다|세요|입니다|합니다|됩니다|에요|아요|어요|해요|다|요|음|죠|까요|네요|군요|거든요|답니다|[.!?])\s*$/.test(
          trimmed,
        );
      }
      case 'has_unclosed_code_block': {
        const codeBlockMatches = (chat.llmResponse || '').match(/```/g);
        return codeBlockMatches ? codeBlockMatches.length % 2 !== 0 : false;
      }
      case 'response_question_count': {
        const questionMatches = (chat.llmResponse || '').match(/\?/g);
        return questionMatches ? questionMatches.length : 0;
      }
      case 'apology_count': {
        const apologyMatches = (chat.llmResponse || '')
          .toLowerCase()
          .match(
            /죄송|미안|sorry|apologize|이해하지 못|답변.*?어렵|도움.*?드리기.*?어렵/g,
          );
        return apologyMatches ? apologyMatches.length : 0;
      }
      case 'next_user_input':
        return (
          ((chat as Record<string, unknown>).nextUserInput as string) || ''
        );
      default:
        return null;
    }
  }

  // ==================== SQL 미리보기 ====================

  /**
   * 특정 규칙의 SQL 미리보기 쿼리 생성 (실행하지 않음)
   */
  async generateRulePreviewQuery(
    ruleId: string,
    days: number = 7,
  ): Promise<{ query: string; needsCTE: boolean }> {
    const rule = await this.getRuleById(ruleId);

    const condition = isCompoundConfig(rule.config)
      ? this.buildCompoundCondition(rule.config)
      : this.buildSingleCondition(rule.config);

    if (!condition) {
      return {
        query: '-- 유효한 SQL 조건을 생성할 수 없습니다',
        needsCTE: false,
      };
    }

    const needsCTE = this.rulesNeedCTE([rule]);
    const query = this.buildProblematicChatsQuery(
      [condition],
      days,
      100,
      0,
      undefined,
      undefined,
      needsCTE,
    );

    // {{TABLE}} 플레이스홀더를 실제 테이블 참조로 치환
    const resolvedQuery = this.resolveTablePlaceholder(query);

    return { query: resolvedQuery.trim(), needsCTE };
  }

  /**
   * {{TABLE}} 플레이스홀더를 실제 테이블 참조로 치환
   */
  private resolveTablePlaceholder(query: string): string {
    const projectId = process.env.GCP_PROJECT_ID || 'project';
    const dataset = process.env.BIGQUERY_DATASET || 'dataset';
    const table = process.env.BIGQUERY_TABLE || 'logs';

    return query.replace(/\{\{TABLE\}\}/g, `${projectId}.${dataset}.${table}`);
  }

  // ==================== 쿼리 실행 ====================

  private rulesNeedCTE(rules: ParsedProblematicChatRule[]): boolean {
    const checkCondition = (config: ProblematicChatRuleConfig): boolean => {
      if (isCompoundConfig(config)) {
        return config.conditions.some((c) => {
          const fieldDef = getFieldDefinition(c.field);
          return fieldDef?.requiresCTE === true;
        });
      }
      const fieldDef = getFieldDefinition(config.field);
      return fieldDef?.requiresCTE === true;
    };
    return rules.some((rule) => checkCondition(rule.config));
  }

  private async queryProblematicChats(
    rules: ParsedProblematicChatRule[],
    days: number,
    limit: number,
    offset: number,
    userId?: string,
    tenantId?: string,
  ): Promise<Omit<ProblematicChatItem, 'matchedRules'>[]> {
    const needsCTE = this.rulesNeedCTE(rules);
    const conditions = this.buildWhereConditions(rules, needsCTE);

    if (conditions.length === 0) {
      return [];
    }

    const query = this.buildProblematicChatsQuery(
      conditions,
      days,
      limit,
      offset,
      userId,
      tenantId,
      needsCTE,
    );

    try {
      const results = await this.dataSource.executeRawQuery<{
        id: string;
        timestamp: { value: string } | string;
        userId: string;
        tenantId: string;
        userInput: string;
        llmResponse: string;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        success: boolean;
        sessionId: string | null;
      }>(query);

      return results.map((row) => ({
        id: row.id || `${row.timestamp}-${row.userId}`.substring(0, 36),
        timestamp:
          typeof row.timestamp === 'object'
            ? row.timestamp.value
            : row.timestamp,
        userId: row.userId || 'unknown',
        tenantId: row.tenantId,
        userInput: row.userInput || '',
        llmResponse: row.llmResponse || '',
        inputTokens: Number(row.inputTokens) || 0,
        outputTokens: Number(row.outputTokens) || 0,
        totalTokens: Number(row.totalTokens) || 0,
        success: row.success === true,
        sessionId: row.sessionId || undefined,
        nextUserInput:
          ((row as Record<string, unknown>).nextUserInput as string) ||
          undefined,
      }));
    } catch (error) {
      this.logger.error(`Failed to query problematic chats: ${error.message}`);
      throw error;
    }
  }

  private buildProblematicChatsQuery(
    conditions: string[],
    days: number,
    limit: number,
    offset: number,
    userId?: string,
    tenantId?: string,
    needsCTE: boolean = false,
  ): string {
    const additionalFilters: string[] = [];
    if (userId) {
      additionalFilters.push(
        `request_metadata.x_enc_data = '${this.escapeForLike(userId)}'`,
      );
    }
    if (tenantId) {
      additionalFilters.push(`tenant_id = '${this.escapeForLike(tenantId)}'`);
    }

    if (needsCTE) {
      const baseWhereClause = [
        `timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)`,
        ...additionalFilters,
      ].join(' AND ');

      const ruleWhereClause = `(${conditions.join(' OR ')})`;

      return `
        WITH enriched AS (
          SELECT *,
            LEAD(user_input) OVER (PARTITION BY request_metadata.session_id ORDER BY timestamp) as next_user_input
          FROM \`{{TABLE}}\`
          WHERE ${baseWhereClause}
        )
        SELECT
          FORMAT('%s-%s', CAST(timestamp AS STRING), COALESCE(request_metadata.x_enc_data, 'unknown')) as id,
          timestamp,
          COALESCE(request_metadata.x_enc_data, 'unknown') as userId,
          tenant_id as tenantId,
          user_input as userInput,
          llm_response as llmResponse,
          COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0) as inputTokens,
          COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0) as outputTokens,
          COALESCE(SAFE_CAST(total_tokens AS FLOAT64), 0) as totalTokens,
          success,
          request_metadata.session_id as sessionId,
          next_user_input as nextUserInput
        FROM enriched
        WHERE ${ruleWhereClause}
        ORDER BY timestamp DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    }

    const whereClause = [
      `timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)`,
      `(${conditions.join(' OR ')})`,
      ...additionalFilters,
    ].join(' AND ');

    return `
      SELECT
        FORMAT('%s-%s', CAST(timestamp AS STRING), COALESCE(request_metadata.x_enc_data, 'unknown')) as id,
        timestamp,
        COALESCE(request_metadata.x_enc_data, 'unknown') as userId,
        tenant_id as tenantId,
        user_input as userInput,
        llm_response as llmResponse,
        COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0) as inputTokens,
        COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0) as outputTokens,
        COALESCE(SAFE_CAST(total_tokens AS FLOAT64), 0) as totalTokens,
        success,
        request_metadata.session_id as sessionId
      FROM \`{{TABLE}}\`
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  }

  private async countByRule(
    rule: ParsedProblematicChatRule,
    days: number,
    tenantId?: string,
  ): Promise<number> {
    // CTE가 필요한 규칙은 단순 COUNT에서 건너뜀
    const config = rule.config;
    const needsCTE = isCompoundConfig(config)
      ? config.conditions.some(
          (c) => getFieldDefinition(c.field)?.requiresCTE,
        )
      : getFieldDefinition(config.field)?.requiresCTE === true;
    if (needsCTE) return 0;

    const conditions = this.buildWhereConditions([rule]);
    if (conditions.length === 0) return 0;

    const additionalFilters: string[] = [];
    if (tenantId) {
      additionalFilters.push(`tenant_id = '${this.escapeForLike(tenantId)}'`);
    }

    const whereClause = [
      `timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)`,
      conditions[0],
      ...additionalFilters,
    ].join(' AND ');

    const query = `
      SELECT COUNT(*) as count
      FROM \`{{TABLE}}\`
      WHERE ${whereClause}
    `;

    try {
      const results = await this.dataSource.executeRawQuery<{ count: number }>(
        query,
      );
      return Number(results[0]?.count) || 0;
    } catch (error) {
      this.logger.error(
        `Failed to count by rule ${rule.name}: ${error.message}`,
      );
      return 0;
    }
  }

  private async countByTenant(
    rules: ParsedProblematicChatRule[],
    days: number,
    tenantId?: string,
  ): Promise<Array<{ tenantId: string; count: number }>> {
    // CTE가 필요한 규칙은 단순 COUNT 쿼리에서 제외 (LEAD 등 윈도우 함수 WHERE 사용 불가)
    const nonCTERules = rules.filter((rule) => {
      const config = rule.config;
      if (isCompoundConfig(config)) {
        return !config.conditions.some(
          (c) => getFieldDefinition(c.field)?.requiresCTE,
        );
      }
      return !getFieldDefinition(config.field)?.requiresCTE;
    });
    const conditions = this.buildWhereConditions(nonCTERules);
    if (conditions.length === 0) return [];

    const additionalFilters: string[] = [];
    if (tenantId) {
      additionalFilters.push(`tenant_id = '${this.escapeForLike(tenantId)}'`);
    }

    const whereClause = [
      `timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)`,
      `(${conditions.join(' OR ')})`,
      ...additionalFilters,
    ].join(' AND ');

    const query = `
      SELECT tenant_id as tenantId, COUNT(*) as count
      FROM \`{{TABLE}}\`
      WHERE ${whereClause}
      GROUP BY tenant_id
      ORDER BY count DESC
      LIMIT 20
    `;

    try {
      const results = await this.dataSource.executeRawQuery<{
        tenantId: string;
        count: number;
      }>(query);
      return results.map((r) => ({
        tenantId: r.tenantId,
        count: Number(r.count),
      }));
    } catch (error) {
      this.logger.error(`Failed to count by tenant: ${error.message}`);
      return [];
    }
  }
}
