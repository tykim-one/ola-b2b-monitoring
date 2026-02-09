import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../admin/database/prisma.service';
import { SlackNotificationService } from '../notifications/slack-notification.service';
import { ExternalDbService } from './external-db.service';
import {
  UiCheckConfig,
  AuthConfig,
  DefaultsConfig,
  UiCheckTarget,
  UiCheckDefinition,
  UiCheckType,
} from './interfaces/ui-check.interface';
import {
  SingleCheckResult,
  UiPageCheckResult,
  UiMonitoringResult,
  UiMonitoringSummary,
  UiTargetStatus,
} from './interfaces/ui-check-result.interface';

@Injectable()
export class UiCheckService {
  private readonly logger = new Logger(UiCheckService.name);

  /** 마지막 체크 결과 캐시 */
  private lastResult: UiMonitoringResult | null = null;

  /** 동시 실행 방지 플래그 */
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly slackService: SlackNotificationService,
    private readonly externalDbService: ExternalDbService,
  ) {}

  // ==================== Public API ====================

  /**
   * UI 체크 기능 활성화 여부
   */
  isEnabled(): boolean {
    const enabled = this.configService.get<string>('UI_CHECK_ENABLED');
    return enabled === 'true' || enabled === '1';
  }

  /**
   * 전체 UI 렌더링 체크 실행 (메인 진입점)
   */
  async runFullUiCheck(
    trigger: 'manual' | 'scheduled' = 'manual',
  ): Promise<UiMonitoringResult> {
    if (!this.isEnabled()) {
      this.logger.warn(
        'UI check is disabled. Set UI_CHECK_ENABLED=true to enable.',
      );
      return this.createDisabledResult();
    }

    if (this.isRunning) {
      throw new Error(
        'UI check is already running. Please wait for the current check to complete.',
      );
    }

    this.isRunning = true;
    const startTime = Date.now();
    let browser: Browser | null = null;

    try {
      this.logger.log(`Starting full UI check (trigger: ${trigger})...`);

      // 1. 설정 로드
      const config = this.loadConfig();
      this.logger.debug(`Loaded config: ${config.targets.length} targets`);

      // 1.5. 동적 URL 해결 (DB에서 UUID 조회)
      config.targets = await this.resolveReportUrls(config.targets);

      // 1.6. 미생성 리포트 처리
      const preResults: UiPageCheckResult[] = [];
      const activeTargets: UiCheckTarget[] = [];

      for (const target of config.targets) {
        if (target.urlTemplate && !target.url) {
          preResults.push({
            targetId: target.id,
            targetName: target.name,
            url: '',
            reportType: target.reportType,
            status: 'broken',
            checks: [
              {
                type: 'element_exists' as UiCheckType,
                description: '리포트 생성 여부',
                status: 'fail',
                message: `오늘 리포트가 생성되지 않았습니다 (theme: ${target.theme}, UUID 미발견)`,
                category: 'structure',
                durationMs: 0,
              },
            ],
            passedCount: 0,
            failedCount: 1,
            errorCount: 0,
            consoleErrors: [],
            pageLoadTimeMs: 0,
            checkedAt: new Date(),
          });
        } else {
          activeTargets.push(target);
        }
      }

      // 2. 브라우저 시작
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      // 3. 인증
      let authSucceeded = false;
      try {
        authSucceeded = await this.authenticate(browser, config.auth);
        this.logger.log(
          `Authentication ${authSucceeded ? 'succeeded' : 'failed'}`,
        );
      } catch (error) {
        this.logger.error(`Authentication error: ${error.message}`);
        authSucceeded = false;
      }

      // 4. 인증 상태를 반영한 브라우저 컨텍스트 생성
      const contextOptions: Record<string, unknown> = {
        viewport: config.defaults.viewport,
      };

      if (authSucceeded && fs.existsSync(config.auth.storageStatePath)) {
        contextOptions.storageState = config.auth.storageStatePath;
      }

      const context = await browser.newContext(contextOptions);

      // 5. 각 타겟 순차 체크 (동시 실행 시 서버 부하 방지)
      const results: UiPageCheckResult[] = [...preResults];
      for (const target of activeTargets) {
        try {
          const result = await this.checkPage(context, target, config.defaults);
          results.push(result);
        } catch (error) {
          this.logger.error(
            `Failed to check target ${target.id}: ${error.message}`,
          );
          results.push(this.createErrorPageResult(target, error.message));
        }
      }

      await context.close();

      // 6. 결과 집계
      const summary = this.buildSummary(results);
      const totalDurationMs = Date.now() - startTime;

      const monitoringResult: UiMonitoringResult = {
        results,
        summary,
        authSucceeded,
        totalDurationMs,
        timestamp: new Date(),
      };

      // 7. 결과 캐시
      this.lastResult = monitoringResult;

      // 8. DB 저장
      await this.saveHistory(monitoringResult, trigger);

      // 9. 이슈 있으면 Slack 알림
      if (summary.degradedTargets > 0 || summary.brokenTargets > 0) {
        await this.sendSlackAlert(monitoringResult);
      }

      this.logger.log(
        `UI check completed in ${totalDurationMs}ms: ` +
          `${summary.healthyTargets} healthy, ${summary.degradedTargets} degraded, ` +
          `${summary.brokenTargets} broken (${summary.passedChecks}/${summary.totalChecks} checks passed)`,
      );

      return monitoringResult;
    } catch (error) {
      this.logger.error(`UI check failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      if (browser) {
        await browser.close().catch((err) => {
          this.logger.error(`Failed to close browser: ${err.message}`);
        });
      }
      this.isRunning = false;
    }
  }

  /**
   * 마지막 체크 결과 조회
   */
  getLastResult(): UiMonitoringResult | null {
    return this.lastResult;
  }

  /**
   * UI 체크 설정 조회 (targets + checks 정의)
   * auth 정보는 제외하고 타겟/체크 항목만 반환
   */
  getCheckConfig() {
    const config = this.loadConfig();
    return {
      defaults: config.defaults,
      targets: config.targets.map((target) => ({
        id: target.id,
        name: target.name,
        urlTemplate: target.urlTemplate || target.url,
        theme: target.theme,
        reportType: target.reportType,
        checksCount: target.checks.length,
        checks: target.checks.map((check) => ({
          type: check.type,
          description: check.description,
          selector: check.selector,
          minCount: check.minCount,
          minContentLength: check.minContentLength,
          patterns: check.patterns,
          sections: check.sections,
          minItems: check.minItems,
          sectionName: check.sectionName,
        })),
      })),
    };
  }

  /**
   * UI 체크 설정 임계값 수정
   * 수정 가능한 필드: minCount, minContentLength, minItems, maxEmptyCells, minColumns, patterns, description
   * 수정 불가 필드: type, selector, sections (구조적 변경 방지)
   */
  updateCheckConfig(updates: { targetId: string; checkIndex: number; values: Record<string, unknown> }) {
    const EDITABLE_FIELDS = ['minCount', 'minContentLength', 'minItems', 'maxEmptyCells', 'minColumns', 'patterns', 'description'];

    const configPath = path.join(process.cwd(), 'config', 'ui-checks.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config: UiCheckConfig = JSON.parse(raw);

    const target = config.targets.find(t => t.id === updates.targetId);
    if (!target) {
      throw new NotFoundException(`Target not found: ${updates.targetId}`);
    }

    if (updates.checkIndex < 0 || updates.checkIndex >= target.checks.length) {
      throw new BadRequestException(`Invalid check index: ${updates.checkIndex}`);
    }

    const check = target.checks[updates.checkIndex];

    // 수정 가능한 필드만 업데이트
    for (const [key, value] of Object.entries(updates.values)) {
      if (!EDITABLE_FIELDS.includes(key)) {
        throw new BadRequestException(`Field '${key}' is not editable. Editable fields: ${EDITABLE_FIELDS.join(', ')}`);
      }
      (check as unknown as Record<string, unknown>)[key] = value;
    }

    // JSON 파일에 저장
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

    this.logger.log(`Updated UI check config: target=${updates.targetId}, checkIndex=${updates.checkIndex}, fields=${Object.keys(updates.values).join(', ')}`);

    // 수정된 설정 반환
    return this.getCheckConfig();
  }

  /**
   * 체크 이력 조회 (페이지네이션)
   */
  async getHistory(params: {
    limit?: number;
    offset?: number;
    hasIssues?: boolean;
  }): Promise<{
    items: Array<{
      id: string;
      trigger: string;
      totalTargets: number;
      healthyTargets: number;
      degradedTargets: number;
      brokenTargets: number;
      totalChecks: number;
      passedChecks: number;
      failedChecks: number;
      authSucceeded: boolean;
      totalDurationMs: number;
      hasIssues: boolean;
      checkedAt: Date;
    }>;
    total: number;
  }> {
    const where: Record<string, unknown> = {};
    if (params.hasIssues !== undefined) {
      where.hasIssues = params.hasIssues;
    }

    const [items, total] = await Promise.all([
      this.prisma.uiCheckHistory.findMany({
        where,
        orderBy: { checkedAt: 'desc' },
        take: params.limit || 20,
        skip: params.offset || 0,
        select: {
          id: true,
          trigger: true,
          totalTargets: true,
          healthyTargets: true,
          degradedTargets: true,
          brokenTargets: true,
          totalChecks: true,
          passedChecks: true,
          failedChecks: true,
          authSucceeded: true,
          totalDurationMs: true,
          hasIssues: true,
          checkedAt: true,
          // results JSON은 목록에서 제외 (대역폭 절약)
        },
      }),
      this.prisma.uiCheckHistory.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * 상세 이력 조회 (결과 JSON 포함)
   */
  async getHistoryDetail(id: string): Promise<UiMonitoringResult | null> {
    const record = await this.prisma.uiCheckHistory.findUnique({
      where: { id },
    });

    if (!record) return null;

    return {
      results: JSON.parse(record.results),
      summary: {
        totalTargets: record.totalTargets,
        healthyTargets: record.healthyTargets,
        degradedTargets: record.degradedTargets,
        brokenTargets: record.brokenTargets,
        totalChecks: record.totalChecks,
        passedChecks: record.passedChecks,
        failedChecks: record.failedChecks,
      },
      authSucceeded: record.authSucceeded,
      totalDurationMs: record.totalDurationMs,
      timestamp: record.checkedAt,
    };
  }

  /**
   * 서비스 상태 확인
   */
  getHealthStatus(): {
    enabled: boolean;
    isRunning: boolean;
    lastCheckAt: Date | null;
    lastCheckHadIssues: boolean | null;
    browserAvailable: boolean;
  } {
    return {
      enabled: this.isEnabled(),
      isRunning: this.isRunning,
      lastCheckAt: this.lastResult?.timestamp || null,
      lastCheckHadIssues: this.lastResult
        ? this.lastResult.summary.degradedTargets > 0 ||
          this.lastResult.summary.brokenTargets > 0
        : null,
      browserAvailable: true, // playwright가 설치되어 있으면 true
    };
  }

  // ==================== Config Loading ====================

  /**
   * 설정 파일 로드 및 환경변수 치환
   */
  private loadConfig(): UiCheckConfig {
    const configPath = path.join(process.cwd(), 'config/ui-checks.json');

    if (!fs.existsSync(configPath)) {
      throw new Error(`UI check config not found: ${configPath}`);
    }

    let configContent = fs.readFileSync(configPath, 'utf-8');

    // ${ENV_VAR} 패턴을 실제 환경변수 값으로 치환
    configContent = configContent.replace(
      /\$\{(\w+)\}/g,
      (_match, envVar: string) => {
        const value = this.configService.get<string>(envVar);
        if (value === undefined || value === null) {
          this.logger.warn(
            `Environment variable ${envVar} not set, using empty string`,
          );
          return '';
        }
        return value;
      },
    );

    try {
      return JSON.parse(configContent) as UiCheckConfig;
    } catch (error) {
      throw new Error(`Failed to parse UI check config: ${error.message}`);
    }
  }

  /**
   * 동적 URL 해결: urlTemplate의 {uuid}를 DB에서 조회한 실제 UUID로 치환
   */
  private async resolveReportUrls(
    targets: UiCheckTarget[],
  ): Promise<UiCheckTarget[]> {
    const dynamicTargets = targets.filter((t) => t.theme && t.urlTemplate);
    if (dynamicTargets.length === 0) return targets;

    const themes = dynamicTargets.map((t) => t.theme!);
    const uuids = await this.externalDbService.getTodayReportUuids(themes);

    this.logger.debug(
      `Resolved UUIDs: ${Array.from(uuids.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
    );

    return targets.map((t) => {
      if (t.theme && t.urlTemplate) {
        const uuid = uuids.get(t.theme);
        if (uuid) {
          return { ...t, url: t.urlTemplate.replace('{uuid}', uuid) };
        }
        return { ...t, url: '' };
      }
      return t;
    });
  }

  // ==================== Authentication ====================

  /**
   * 로그인 플로우 실행 및 storageState 저장
   */
  private async authenticate(
    browser: Browser,
    authConfig: AuthConfig,
  ): Promise<boolean> {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      this.logger.debug(`Navigating to login page: ${authConfig.loginUrl}`);
      await page.goto(authConfig.loginUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // 로그인 폼 입력
      const username = this.configService.get<string>('UI_CHECK_USERNAME');
      const password = this.configService.get<string>('UI_CHECK_PASSWORD');

      if (!username || !password) {
        this.logger.error('UI_CHECK_USERNAME or UI_CHECK_PASSWORD not set');
        return false;
      }

      await page.fill(authConfig.usernameSelector, username);
      await page.fill(authConfig.passwordSelector, password);
      await page.click(authConfig.submitSelector);

      // 로그인 성공 지표 대기
      await page.waitForSelector(authConfig.successIndicator, {
        timeout: 15000,
      });

      // storageState 저장 (세션 쿠키, localStorage 등)
      const stateDir = path.dirname(authConfig.storageStatePath);
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      await context.storageState({ path: authConfig.storageStatePath });
      this.logger.log('Authentication succeeded, storage state saved');

      return true;
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);
      return false;
    } finally {
      await page.close();
      await context.close();
    }
  }

  // ==================== Page Checking ====================

  /**
   * 단일 타겟 페이지 체크
   */
  private async checkPage(
    context: BrowserContext,
    target: UiCheckTarget,
    defaults: DefaultsConfig,
  ): Promise<UiPageCheckResult> {
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageStartTime = Date.now();

    // 콘솔 에러 수집
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    try {
      this.logger.debug(`Checking target: ${target.name} (${target.url})`);

      // 페이지 로드
      await page.goto(target.url, {
        waitUntil: 'networkidle',
        timeout: defaults.timeout,
      });

      // 기본 셀렉터 대기 (페이지 렌더링 완료 지표)
      if (defaults.waitForSelector) {
        await page
          .waitForSelector(defaults.waitForSelector, {
            timeout: defaults.timeout,
          })
          .catch(() => {
            this.logger.warn(
              `Default waitForSelector timed out for ${target.id}: ${defaults.waitForSelector}`,
            );
          });
      }

      const pageLoadTimeMs = Date.now() - pageStartTime;

      // 각 체크 실행
      const checks: SingleCheckResult[] = [];
      for (const checkDef of target.checks) {
        const result = await this.runSingleCheck(page, checkDef, consoleErrors);
        if (Array.isArray(result)) {
          checks.push(...result);
        } else {
          checks.push(result);
        }
      }

      // 통계 계산
      const passedCount = checks.filter((c) => c.status === 'pass').length;
      const failedCount = checks.filter((c) => c.status === 'fail').length;
      const errorCount = checks.filter(
        (c) => c.status === 'error' || c.status === 'timeout',
      ).length;

      // 상태 판정
      const status = this.determineTargetStatus(checks);

      // 실패 시 스크린샷
      let screenshotPath: string | undefined;
      if (status !== 'healthy') {
        screenshotPath = await this.takeScreenshot(page, target.id);
      }

      return {
        targetId: target.id,
        targetName: target.name,
        url: target.url,
        reportType: target.reportType,
        status,
        checks,
        passedCount,
        failedCount,
        errorCount,
        consoleErrors,
        screenshotPath,
        pageLoadTimeMs,
        checkedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Page check error for ${target.id}: ${error.message}`);

      // 타임아웃이나 네비게이션 에러의 경우에도 스크린샷 시도
      const screenshotPath = await this.takeScreenshot(page, target.id).catch(
        () => undefined,
      );

      return {
        targetId: target.id,
        targetName: target.name,
        url: target.url,
        reportType: target.reportType,
        status: 'broken',
        checks: [
          {
            type: 'element_exists' as UiCheckType,
            description: 'Page load',
            status: 'error',
            message: error.message,
            durationMs: Date.now() - pageStartTime,
          },
        ],
        passedCount: 0,
        failedCount: 0,
        errorCount: 1,
        consoleErrors,
        screenshotPath,
        pageLoadTimeMs: Date.now() - pageStartTime,
        checkedAt: new Date(),
      };
    } finally {
      await page.close();
    }
  }

  /**
   * 단일 체크 실행
   */
  private async runSingleCheck(
    page: Page,
    check: UiCheckDefinition,
    consoleErrors: string[],
  ): Promise<SingleCheckResult | SingleCheckResult[]> {
    const startTime = Date.now();

    try {
      switch (check.type) {
        case 'element_exists':
          return await this.checkElementExists(page, check, startTime);

        case 'element_count_min':
          return await this.checkElementCountMin(page, check, startTime);

        case 'no_error_text':
          return await this.checkNoErrorText(page, check, startTime);

        case 'chart_rendered':
          return await this.checkChartRendered(page, check, startTime);

        case 'no_console_errors':
          return this.checkNoConsoleErrors(check, consoleErrors, startTime);

        case 'no_empty_page':
          return await this.checkNoEmptyPage(page, check, startTime);

        case 'section_exists':
          return await this.checkSectionExists(page, check, startTime);

        case 'table_structure':
          return await this.checkTableStructure(page, check, startTime);

        case 'no_empty_cells':
          return await this.checkNoEmptyCells(page, check, startTime);

        case 'content_not_empty':
          return await this.checkContentNotEmpty(page, check, startTime);

        default:
          return {
            type: check.type,
            description: check.description,
            status: 'error',
            message: `Unknown check type: ${check.type}`,
            durationMs: Date.now() - startTime,
          };
      }
    } catch (error) {
      return {
        type: check.type,
        description: check.description,
        status: 'error',
        message: error.message,
        selector: check.selector,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // ==================== Individual Check Implementations ====================

  /**
   * 요소 존재 여부 체크
   */
  private async checkElementExists(
    page: Page,
    check: UiCheckDefinition,
    startTime: number,
  ): Promise<SingleCheckResult> {
    const selector = check.selector!;
    const count = await page.locator(selector).count();
    const exists = count > 0;

    return {
      type: check.type,
      description: check.description,
      status: exists ? 'pass' : 'fail',
      message: exists
        ? `Element found (${count} match${count > 1 ? 'es' : ''})`
        : `Element not found: ${selector}`,
      selector,
      expected: 'exists',
      actual: `count=${count}`,
      durationMs: Date.now() - startTime,
      category: 'rendering',
    };
  }

  /**
   * 최소 요소 개수 체크
   */
  private async checkElementCountMin(
    page: Page,
    check: UiCheckDefinition,
    startTime: number,
  ): Promise<SingleCheckResult> {
    const selector = check.selector!;
    const minCount = check.minCount || 1;
    const count = await page.locator(selector).count();
    const passed = count >= minCount;

    return {
      type: check.type,
      description: check.description,
      status: passed ? 'pass' : 'fail',
      message: passed
        ? `Found ${count} elements (min: ${minCount})`
        : `Found only ${count} elements, expected at least ${minCount}`,
      selector,
      expected: `>= ${minCount}`,
      actual: `${count}`,
      durationMs: Date.now() - startTime,
      category: 'rendering',
    };
  }

  /**
   * 에러 텍스트 부재 체크 (case-insensitive regex)
   */
  private async checkNoErrorText(
    page: Page,
    check: UiCheckDefinition,
    startTime: number,
  ): Promise<SingleCheckResult> {
    const bodyText = (await page.locator('body').textContent()) || '';
    const patterns = check.patterns || [];
    const foundPatterns: string[] = [];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(bodyText)) {
        foundPatterns.push(pattern);
      }
    }

    const passed = foundPatterns.length === 0;

    return {
      type: check.type,
      description: check.description,
      status: passed ? 'pass' : 'fail',
      message: passed
        ? 'No error text patterns found'
        : `Error text found matching: ${foundPatterns.join(', ')}`,
      expected: 'no error patterns',
      actual: passed ? 'clean' : `matched: [${foundPatterns.join(', ')}]`,
      durationMs: Date.now() - startTime,
      category: 'error',
    };
  }

  /**
   * 차트 렌더링 체크 (canvas/svg 요소)
   */
  private async checkChartRendered(
    page: Page,
    check: UiCheckDefinition,
    startTime: number,
  ): Promise<SingleCheckResult> {
    // 커스텀 셀렉터가 있으면 사용, 없으면 canvas/svg 기본 체크
    const selector = check.selector || 'canvas, svg.recharts-surface';
    const count = await page.locator(selector).count();
    const rendered = count > 0;

    return {
      type: check.type,
      description: check.description,
      status: rendered ? 'pass' : 'fail',
      message: rendered
        ? `Chart rendered (${count} chart element${count > 1 ? 's' : ''} found)`
        : `No chart elements found: ${selector}`,
      selector,
      expected: 'chart rendered',
      actual: `count=${count}`,
      durationMs: Date.now() - startTime,
      category: 'rendering',
    };
  }

  /**
   * 콘솔 에러 부재 체크
   */
  private checkNoConsoleErrors(
    check: UiCheckDefinition,
    consoleErrors: string[],
    startTime: number,
  ): SingleCheckResult {
    const passed = consoleErrors.length === 0;

    return {
      type: check.type,
      description: check.description,
      status: passed ? 'pass' : 'fail',
      message: passed
        ? 'No console errors detected'
        : `${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 3).join('; ')}`,
      expected: '0 console errors',
      actual: `${consoleErrors.length} errors`,
      durationMs: Date.now() - startTime,
      category: 'error',
    };
  }

  /**
   * 빈 페이지 체크
   */
  private async checkNoEmptyPage(
    page: Page,
    check: UiCheckDefinition,
    startTime: number,
  ): Promise<SingleCheckResult> {
    const bodyText = (await page.locator('body').textContent()) || '';
    const contentLength = bodyText.trim().length;
    const minContentLength = check.minContentLength || 100;
    const passed = contentLength >= minContentLength;

    return {
      type: check.type,
      description: check.description,
      status: passed ? 'pass' : 'fail',
      message: passed
        ? `Page has content (${contentLength} chars)`
        : `Page appears empty or too short (${contentLength} chars, min: ${minContentLength})`,
      expected: `>= ${minContentLength} chars`,
      actual: `${contentLength} chars`,
      durationMs: Date.now() - startTime,
      category: 'rendering',
    };
  }

  /**
   * 필수 섹션 존재 여부 체크 (배열 반환 -- 섹션마다 개별 결과)
   */
  private async checkSectionExists(
    page: Page,
    check: UiCheckDefinition,
    startTime: number,
  ): Promise<SingleCheckResult[]> {
    const results: SingleCheckResult[] = [];
    if (!check.sections) return results;

    for (const section of check.sections) {
      const sectionStart = Date.now();
      let found = false;

      // 전략 1: sectionSelector로 찾기 ("..."이 아닌 경우만)
      if (section.sectionSelector && section.sectionSelector !== '...') {
        const count = await page.locator(section.sectionSelector).count();
        found = count > 0;
      }

      // 전략 2 (fallback): headingText로 페이지 전체에서 텍스트 검색
      if (!found && section.headingText) {
        const textLocator = page.getByText(section.headingText, {
          exact: false,
        });
        found = (await textLocator.count()) > 0;
      }

      results.push({
        type: 'section_exists',
        description: `섹션: ${section.name}`,
        status: found ? 'pass' : 'fail',
        message: found
          ? `"${section.name}" 섹션 발견`
          : `"${section.name}" 섹션 누락`,
        selector: section.sectionSelector,
        category: 'structure',
        durationMs: Date.now() - sectionStart,
      });
    }
    return results;
  }

  /**
   * 테이블 구조 체크 (최소 행/열 수)
   */
  private async checkTableStructure(
    page: Page,
    check: UiCheckDefinition,
    startTime: number,
  ): Promise<SingleCheckResult> {
    const selector = check.selector || 'table';

    // 셀렉터 미설정("...") 시 에러로 반환
    if (selector === '...') {
      return {
        type: 'table_structure',
        description: check.description,
        status: 'error',
        message: `셀렉터 미설정 (${check.tableName || '테이블'}): DevTools에서 확인 후 설정 필요`,
        category: 'structure',
        durationMs: Date.now() - startTime,
      };
    }

    const table = page.locator(selector).first();
    const tableExists = (await table.count()) > 0;

    if (!tableExists) {
      return {
        type: 'table_structure',
        description: check.description,
        status: 'fail',
        message: `테이블 미발견: ${selector}`,
        selector,
        category: 'structure',
        durationMs: Date.now() - startTime,
      };
    }

    const rowCount = await table.locator('tbody tr').count();
    const minCount = check.minCount || 1;
    const rowPassed = rowCount >= minCount;

    let colPassed = true;
    let colCount = 0;
    if (check.minColumns) {
      colCount = await table
        .locator('thead th, tbody tr:first-child td')
        .count();
      colPassed = colCount >= check.minColumns;
    }

    const passed = rowPassed && colPassed;
    return {
      type: 'table_structure',
      description: check.description,
      status: passed ? 'pass' : 'fail',
      message: passed
        ? `${check.tableName || '테이블'}: ${rowCount}행${check.minColumns ? `, ${colCount}열` : ''}`
        : `${check.tableName || '테이블'}: ${rowCount}행 (최소 ${minCount})${!colPassed ? `, ${colCount}열 (최소 ${check.minColumns})` : ''}`,
      selector,
      expected: `>= ${minCount} rows`,
      actual: `${rowCount} rows`,
      category: 'structure',
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 테이블 빈 셀 감지
   */
  private async checkNoEmptyCells(
    page: Page,
    check: UiCheckDefinition,
    startTime: number,
  ): Promise<SingleCheckResult> {
    const selector = check.selector || 'table';

    // 셀렉터 미설정("...") 시 에러로 반환
    if (selector === '...') {
      return {
        type: 'no_empty_cells',
        description: check.description,
        status: 'error',
        message: `셀렉터 미설정 (${check.tableName || '테이블'}): DevTools에서 확인 후 설정 필요`,
        category: 'content',
        durationMs: Date.now() - startTime,
      };
    }

    const emptyPatterns = check.emptyPatterns || ['', '-', 'N/A', 'null', '--'];
    const maxEmpty = check.maxEmptyCells ?? 0;

    const rows = await page.locator(`${selector} tbody tr`).all();
    let emptyCellCount = 0;
    const emptyPositions: string[] = [];

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const cells = await rows[rowIdx].locator('td').all();
      for (let colIdx = 0; colIdx < cells.length; colIdx++) {
        if (check.columnIndices && !check.columnIndices.includes(colIdx))
          continue;
        const text = ((await cells[colIdx].textContent()) || '').trim();
        if (emptyPatterns.includes(text)) {
          emptyCellCount++;
          emptyPositions.push(`row${rowIdx + 1}:col${colIdx + 1}`);
        }
      }
    }

    const passed = emptyCellCount <= maxEmpty;
    return {
      type: 'no_empty_cells',
      description: check.description,
      status: passed ? 'pass' : 'fail',
      message: passed
        ? `${check.tableName || '테이블'}: 빈 셀 없음`
        : `${check.tableName || '테이블'}: ${emptyCellCount}개 빈 셀 (${emptyPositions.slice(0, 5).join(', ')}${emptyPositions.length > 5 ? '...' : ''})`,
      selector,
      expected: `<= ${maxEmpty} empty cells`,
      actual: `${emptyCellCount}`,
      category: 'content',
      details: { emptyCellCount, emptyPositions: emptyPositions.slice(0, 20) },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 텍스트 섹션 최소 콘텐츠 길이 체크
   */
  private async checkContentNotEmpty(
    page: Page,
    check: UiCheckDefinition,
    startTime: number,
  ): Promise<SingleCheckResult> {
    const selector = check.selector || 'body';

    // 셀렉터 미설정("...") 시 에러로 반환
    if (selector === '...') {
      return {
        type: 'content_not_empty',
        description: check.description,
        status: 'error',
        message: `셀렉터 미설정 (${check.sectionName || '섹션'}): DevTools에서 확인 후 설정 필요`,
        category: 'content',
        durationMs: Date.now() - startTime,
      };
    }

    const container = page.locator(selector).first();
    const exists = (await container.count()) > 0;

    if (!exists) {
      return {
        type: 'content_not_empty',
        description: check.description,
        status: 'fail',
        message: `컨테이너 미발견: ${selector}`,
        selector,
        category: 'content',
        durationMs: Date.now() - startTime,
      };
    }

    const text = ((await container.textContent()) || '').trim();
    const minLen = check.minContentLength || 50;
    const lenPassed = text.length >= minLen;

    let itemPassed = true;
    let itemCount = 0;
    if (check.itemSelector && check.minItems) {
      itemCount = await container.locator(check.itemSelector).count();
      itemPassed = itemCount >= check.minItems;
    }

    const passed = lenPassed && itemPassed;
    return {
      type: 'content_not_empty',
      description: check.description,
      status: passed ? 'pass' : 'fail',
      message: passed
        ? `${check.sectionName || '섹션'}: ${text.length}자${check.minItems ? `, ${itemCount}개 항목` : ''}`
        : `${check.sectionName || '섹션'}: ${text.length}자 (최소 ${minLen})${!itemPassed ? `, ${itemCount}개 (최소 ${check.minItems})` : ''}`,
      selector,
      expected: `>= ${minLen} chars`,
      actual: `${text.length} chars`,
      category: 'content',
      durationMs: Date.now() - startTime,
    };
  }

  // ==================== Status Determination ====================

  /**
   * 타겟 상태 판정
   * - healthy: 모든 체크 통과
   * - degraded: 일부 실패
   * - broken: 50% 초과 실패 또는 에러 발생
   */
  private determineTargetStatus(checks: SingleCheckResult[]): UiTargetStatus {
    if (checks.length === 0) return 'broken';

    const passedCount = checks.filter((c) => c.status === 'pass').length;
    const errorCount = checks.filter(
      (c) => c.status === 'error' || c.status === 'timeout',
    ).length;
    const failedCount = checks.filter((c) => c.status === 'fail').length;

    // 모두 통과
    if (passedCount === checks.length) return 'healthy';

    // 에러가 있거나 50% 초과 실패
    if (errorCount > 0 || failedCount + errorCount > checks.length / 2) {
      return 'broken';
    }

    // 일부 실패
    return 'degraded';
  }

  // ==================== Screenshot ====================

  /**
   * 스크린샷 저장
   */
  private async takeScreenshot(page: Page, targetId: string): Promise<string> {
    const screenshotDir =
      this.configService.get<string>('UI_CHECK_SCREENSHOT_DIR') ||
      path.join(process.cwd(), 'screenshots');

    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `${targetId}_${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);

    await page.screenshot({ path: filepath, fullPage: true });
    this.logger.debug(`Screenshot saved: ${filepath}`);

    return filepath;
  }

  // ==================== Summary & Helpers ====================

  /**
   * 결과 요약 빌드
   */
  private buildSummary(results: UiPageCheckResult[]): UiMonitoringSummary {
    return {
      totalTargets: results.length,
      healthyTargets: results.filter((r) => r.status === 'healthy').length,
      degradedTargets: results.filter((r) => r.status === 'degraded').length,
      brokenTargets: results.filter((r) => r.status === 'broken').length,
      totalChecks: results.reduce((sum, r) => sum + r.checks.length, 0),
      passedChecks: results.reduce((sum, r) => sum + r.passedCount, 0),
      failedChecks: results.reduce(
        (sum, r) => sum + r.failedCount + r.errorCount,
        0,
      ),
    };
  }

  /**
   * 비활성화 시 빈 결과
   */
  private createDisabledResult(): UiMonitoringResult {
    return {
      results: [],
      summary: {
        totalTargets: 0,
        healthyTargets: 0,
        degradedTargets: 0,
        brokenTargets: 0,
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
      },
      authSucceeded: false,
      totalDurationMs: 0,
      timestamp: new Date(),
    };
  }

  /**
   * 에러 발생 시 페이지 결과 생성
   */
  private createErrorPageResult(
    target: UiCheckTarget,
    errorMessage: string,
  ): UiPageCheckResult {
    return {
      targetId: target.id,
      targetName: target.name,
      url: target.url,
      reportType: target.reportType,
      status: 'broken',
      checks: [
        {
          type: 'element_exists' as UiCheckType,
          description: 'Page accessibility',
          status: 'error',
          message: errorMessage,
          durationMs: 0,
        },
      ],
      passedCount: 0,
      failedCount: 0,
      errorCount: 1,
      consoleErrors: [],
      pageLoadTimeMs: 0,
      checkedAt: new Date(),
    };
  }

  // ==================== Persistence ====================

  /**
   * 체크 결과를 DB에 저장
   */
  private async saveHistory(
    result: UiMonitoringResult,
    trigger: 'manual' | 'scheduled',
  ): Promise<void> {
    try {
      await this.prisma.uiCheckHistory.create({
        data: {
          trigger,
          totalTargets: result.summary.totalTargets,
          healthyTargets: result.summary.healthyTargets,
          degradedTargets: result.summary.degradedTargets,
          brokenTargets: result.summary.brokenTargets,
          totalChecks: result.summary.totalChecks,
          passedChecks: result.summary.passedChecks,
          failedChecks: result.summary.failedChecks,
          authSucceeded: result.authSucceeded,
          totalDurationMs: result.totalDurationMs,
          hasIssues:
            result.summary.degradedTargets > 0 ||
            result.summary.brokenTargets > 0,
          results: JSON.stringify(result.results),
          checkedAt: result.timestamp,
        },
      });
      this.logger.debug('UI check result saved to history');
    } catch (error) {
      this.logger.error(`Failed to save UI check history: ${error.message}`);
      // 이력 저장 실패가 체크 자체를 중단시키지 않도록
    }
  }

  // ==================== Slack Notification ====================

  /**
   * Slack 알림 발송
   */
  private async sendSlackAlert(result: UiMonitoringResult): Promise<void> {
    const severity = result.summary.brokenTargets > 0 ? 'critical' : 'warning';

    // 이슈 타겟 상세 정보 (category별 그룹핑)
    const issueDetails = result.results
      .filter((r) => r.status !== 'healthy')
      .map((r) => {
        const byCategory = {
          structure: r.checks.filter(
            (c) => c.status !== 'pass' && c.category === 'structure',
          ),
          content: r.checks.filter(
            (c) => c.status !== 'pass' && c.category === 'content',
          ),
          rendering: r.checks.filter(
            (c) => c.status !== 'pass' && c.category === 'rendering',
          ),
          error: r.checks.filter(
            (c) => c.status !== 'pass' && c.category === 'error',
          ),
          uncategorized: r.checks.filter(
            (c) => c.status !== 'pass' && !c.category,
          ),
        };
        const lines: string[] = [];
        if (byCategory.structure.length)
          lines.push(
            ...byCategory.structure.map(
              (c) => `  📋 [구조] ${c.description}: ${c.message}`,
            ),
          );
        if (byCategory.content.length)
          lines.push(
            ...byCategory.content.map(
              (c) => `  📝 [콘텐츠] ${c.description}: ${c.message}`,
            ),
          );
        if (byCategory.rendering.length)
          lines.push(
            ...byCategory.rendering.map(
              (c) => `  🖥️ [렌더링] ${c.description}: ${c.message}`,
            ),
          );
        if (byCategory.error.length)
          lines.push(
            ...byCategory.error.map(
              (c) => `  ⚠️ [에러] ${c.description}: ${c.message}`,
            ),
          );
        if (byCategory.uncategorized.length)
          lines.push(
            ...byCategory.uncategorized.map(
              (c) => `  ❓ ${c.description}: ${c.message}`,
            ),
          );
        return `*${r.targetName}* (${r.status}):\n${lines.slice(0, 10).join('\n')}`;
      })
      .join('\n\n');

    const fields = [
      {
        name: '전체 타겟',
        value: `${result.summary.totalTargets}개`,
      },
      {
        name: '정상',
        value: `${result.summary.healthyTargets}개`,
      },
      {
        name: '저하',
        value: `${result.summary.degradedTargets}개`,
      },
      {
        name: '장애',
        value: `${result.summary.brokenTargets}개`,
      },
      {
        name: '체크 결과',
        value: `${result.summary.passedChecks}/${result.summary.totalChecks} 통과`,
      },
      {
        name: '소요 시간',
        value: `${(result.totalDurationMs / 1000).toFixed(1)}초`,
      },
      {
        name: '인증',
        value: result.authSucceeded ? '성공' : '실패',
      },
      {
        name: '체크 시간',
        value: result.timestamp.toISOString(),
      },
    ];

    const message = `UI 렌더링 이슈가 감지되었습니다:\n${issueDetails}`;

    await this.slackService.sendAlert({
      title: 'UI 렌더링 이슈 감지',
      message,
      severity: severity,
      fields,
    });

    this.logger.log('Slack alert sent for UI check issues');
  }
}
