import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../admin/database/prisma.service';
import { CacheService, CacheTTL } from '../cache/cache.service';
import { METRICS_DATASOURCE } from '../datasource/interfaces';
import type { MetricsDataSource } from '../datasource/interfaces';
import { CreateRuleDto, UpdateRuleDto, ProblematicChatFilterDto, ProblematicChatStatsFilterDto } from './dto';
import {
  ParsedProblematicChatRule,
  ProblematicChatRuleConfig,
  ProblematicChatItem,
  ProblematicChatStats,
} from './interfaces/problematic-chat.interface';

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
    const rule = await this.prisma.problematicChatRule.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        isEnabled: dto.isEnabled ?? true,
        type: dto.type,
        config: JSON.stringify(dto.config),
      },
    });

    this.invalidateRulesCache();
    this.logger.log(`Created problematic chat rule: ${rule.name} (${rule.id})`);
    return this.parseRule(rule);
  }

  async updateRule(id: string, dto: UpdateRuleDto): Promise<ParsedProblematicChatRule> {
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
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.config !== undefined) {
      // Merge with existing config
      const existingConfig = JSON.parse(existing.config) as ProblematicChatRuleConfig;
      updateData.config = JSON.stringify({ ...existingConfig, ...dto.config });
    }

    const updated = await this.prisma.problematicChatRule.update({
      where: { id },
      data: updateData,
    });

    this.invalidateRulesCache();
    this.logger.log(`Updated problematic chat rule: ${updated.name} (${updated.id})`);
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

  async getProblematicChats(filter: ProblematicChatFilterDto): Promise<ProblematicChatItem[]> {
    const days = filter.days || 7;
    const limit = filter.limit || 100;
    const offset = filter.offset || 0;

    // 캐시 키 생성
    const cacheKey = `problematic-chat:chats:${days}:${limit}:${offset}:${filter.userId || ''}:${filter.tenantId || ''}:${(filter.ruleIds || []).join(',')}`;
    const cached = this.cacheService.get<ProblematicChatItem[]>(cacheKey);
    if (cached) return cached;

    // 활성화된 규칙 조회
    let rules = await this.getEnabledRules();

    // 특정 규칙만 필터링
    if (filter.ruleIds && filter.ruleIds.length > 0) {
      rules = rules.filter((r) => filter.ruleIds!.includes(r.id));
    }

    if (rules.length === 0) {
      return [];
    }

    // BigQuery 쿼리 실행
    const chats = await this.queryProblematicChats(rules, days, limit, offset, filter.userId, filter.tenantId);

    // 각 채팅에 매칭된 규칙 정보 추가
    const result = chats.map((chat) => ({
      ...chat,
      matchedRules: this.getMatchedRuleNames(chat, rules),
    }));

    this.cacheService.set(cacheKey, result, CacheTTL.SHORT);
    return result;
  }

  async getProblematicChatStats(filter: ProblematicChatStatsFilterDto): Promise<ProblematicChatStats> {
    const days = filter.days || 7;
    const cacheKey = `problematic-chat:stats:${days}:${filter.tenantId || ''}`;
    const cached = this.cacheService.get<ProblematicChatStats>(cacheKey);
    if (cached) return cached;

    const rules = await this.getEnabledRules();
    if (rules.length === 0) {
      return { totalCount: 0, byRule: [], byTenant: [] };
    }

    // 규칙별 통계
    const byRule: ProblematicChatStats['byRule'] = [];
    let totalCount = 0;

    for (const rule of rules) {
      const count = await this.countByRule(rule, days, filter.tenantId);
      totalCount += count;
      byRule.push({
        ruleId: rule.id,
        ruleName: rule.name,
        count,
        percentage: 0, // 나중에 계산
      });
    }

    // 퍼센티지 계산
    if (totalCount > 0) {
      byRule.forEach((item) => {
        item.percentage = Math.round((item.count / totalCount) * 100 * 10) / 10;
      });
    }

    // 테넌트별 통계
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
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description || undefined,
      isEnabled: rule.isEnabled,
      type: rule.type as 'token_threshold' | 'keyword_match' | 'token_ratio',
      config: JSON.parse(rule.config) as ProblematicChatRuleConfig,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  private invalidateRulesCache(): void {
    this.cacheService.del('problematic-chat:rules:all');
    this.cacheService.del('problematic-chat:rules:enabled');
    // 채팅 관련 캐시도 무효화 (규칙 변경 시 결과가 달라지므로)
    this.cacheService.delByPattern('problematic-chat:chats');
    this.cacheService.delByPattern('problematic-chat:stats');
  }

  private buildWhereConditions(rules: ParsedProblematicChatRule[]): string[] {
    const conditions: string[] = [];

    for (const rule of rules) {
      if (rule.type === 'token_threshold' && rule.config.threshold !== undefined) {
        const op = rule.config.operator === 'gt' ? '>' : '<';
        // output_tokens가 FLOAT64 또는 STRING일 수 있으므로 SAFE_CAST 후 COALESCE 사용
        conditions.push(`COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0) ${op} ${rule.config.threshold}`);
      } else if (rule.type === 'keyword_match' && rule.config.keywords && rule.config.keywords.length > 0) {
        const field = rule.config.matchField || 'llm_response';
        const keywordConditions = rule.config.keywords.map(
          (keyword) => `LOWER(COALESCE(${field}, '')) LIKE LOWER('%${this.escapeForLike(keyword)}%')`,
        );
        conditions.push(`(${keywordConditions.join(' OR ')})`);
      } else if (rule.type === 'token_ratio') {
        // 토큰 비율: output_tokens / input_tokens
        const ratioExpr = `SAFE_DIVIDE(
          COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0),
          NULLIF(COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0), 0)
        )`;

        const subConditions: string[] = [];
        if (rule.config.minRatio !== undefined) {
          subConditions.push(`${ratioExpr} < ${rule.config.minRatio}`);
        }
        if (rule.config.maxRatio !== undefined) {
          subConditions.push(`${ratioExpr} > ${rule.config.maxRatio}`);
        }

        if (subConditions.length > 0) {
          conditions.push(`(${subConditions.join(' OR ')})`);
        }
      }
    }

    return conditions;
  }

  private escapeForLike(str: string): string {
    return str.replace(/'/g, "''").replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  private async queryProblematicChats(
    rules: ParsedProblematicChatRule[],
    days: number,
    limit: number,
    offset: number,
    userId?: string,
    tenantId?: string,
  ): Promise<Omit<ProblematicChatItem, 'matchedRules'>[]> {
    const conditions = this.buildWhereConditions(rules);

    if (conditions.length === 0) {
      return [];
    }

    // DataSource를 통해 raw query 실행
    // BigQuery 직접 쿼리가 필요하므로 dataSource의 raw query 메서드 사용
    const query = this.buildProblematicChatsQuery(conditions, days, limit, offset, userId, tenantId);

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
        timestamp: typeof row.timestamp === 'object' ? row.timestamp.value : row.timestamp,
        userId: row.userId || 'unknown',
        tenantId: row.tenantId,
        userInput: row.userInput || '',
        llmResponse: row.llmResponse || '',
        inputTokens: Number(row.inputTokens) || 0,
        outputTokens: Number(row.outputTokens) || 0,
        totalTokens: Number(row.totalTokens) || 0,
        success: row.success === true,
        sessionId: row.sessionId || undefined,
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
  ): string {
    const additionalFilters: string[] = [];
    if (userId) {
      additionalFilters.push(`request_metadata.x_enc_data = '${this.escapeForLike(userId)}'`);
    }
    if (tenantId) {
      additionalFilters.push(`tenant_id = '${this.escapeForLike(tenantId)}'`);
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

  private getMatchedRuleNames(
    chat: Omit<ProblematicChatItem, 'matchedRules'>,
    rules: ParsedProblematicChatRule[],
  ): string[] {
    const matched: string[] = [];

    for (const rule of rules) {
      if (rule.type === 'token_threshold' && rule.config.threshold !== undefined) {
        const op = rule.config.operator === 'gt' ? 'gt' : 'lt';
        if (
          (op === 'lt' && chat.outputTokens < rule.config.threshold) ||
          (op === 'gt' && chat.outputTokens > rule.config.threshold)
        ) {
          matched.push(rule.name);
        }
      } else if (rule.type === 'keyword_match' && rule.config.keywords) {
        const field = rule.config.matchField === 'user_input' ? chat.userInput : chat.llmResponse;
        const hasMatch = rule.config.keywords.some((keyword) =>
          field.toLowerCase().includes(keyword.toLowerCase()),
        );
        if (hasMatch) {
          matched.push(rule.name);
        }
      } else if (rule.type === 'token_ratio') {
        const ratio = chat.inputTokens > 0 ? chat.outputTokens / chat.inputTokens : 0;
        const isBelow = rule.config.minRatio !== undefined && ratio < rule.config.minRatio;
        const isAbove = rule.config.maxRatio !== undefined && ratio > rule.config.maxRatio;
        if (isBelow || isAbove) {
          matched.push(rule.name);
        }
      }
    }

    return matched;
  }

  private async countByRule(
    rule: ParsedProblematicChatRule,
    days: number,
    tenantId?: string,
  ): Promise<number> {
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
      const results = await this.dataSource.executeRawQuery<{ count: number }>(query);
      return Number(results[0]?.count) || 0;
    } catch (error) {
      this.logger.error(`Failed to count by rule ${rule.name}: ${error.message}`);
      return 0;
    }
  }

  private async countByTenant(
    rules: ParsedProblematicChatRule[],
    days: number,
    tenantId?: string,
  ): Promise<Array<{ tenantId: string; count: number }>> {
    const conditions = this.buildWhereConditions(rules);
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
      const results = await this.dataSource.executeRawQuery<{ tenantId: string; count: number }>(query);
      return results.map((r) => ({ tenantId: r.tenantId, count: Number(r.count) }));
    } catch (error) {
      this.logger.error(`Failed to count by tenant: ${error.message}`);
      return [];
    }
  }
}
