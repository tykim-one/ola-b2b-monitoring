import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../admin/database/prisma.service';
import { SlackNotificationService } from '../notifications/slack-notification.service';
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
      const results: UiPageCheckResult[] = [];
      for (const target of config.targets) {
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
        checks.push(result);
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
  ): Promise<SingleCheckResult> {
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

    // 이슈 타겟 상세 정보
    const issueDetails = result.results
      .filter((r) => r.status !== 'healthy')
      .map((r) => {
        const failedChecks = r.checks
          .filter((c) => c.status !== 'pass')
          .map((c) => c.description)
          .join(', ');
        return `- *${r.targetName}* (${r.status}): ${failedChecks}`;
      })
      .slice(0, 10)
      .join('\n');

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
