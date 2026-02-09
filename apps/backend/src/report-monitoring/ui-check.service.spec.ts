import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { UiCheckService } from './ui-check.service';
import { PrismaService } from '../admin/database/prisma.service';
import { SlackNotificationService } from '../notifications/slack-notification.service';
import { ExternalDbService } from './external-db.service';
import {
  UiCheckDefinition,
  UiCheckType,
} from './interfaces/ui-check.interface';
import { SingleCheckResult } from './interfaces/ui-check-result.interface';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

// ==================== Mock Helpers ====================

/** Sentinel locator used as the terminal node to avoid infinite recursion */
let _nullLocator: any;
function getNullLocator() {
  if (!_nullLocator) {
    _nullLocator = {
      count: jest.fn().mockResolvedValue(0),
      textContent: jest.fn().mockResolvedValue(''),
      first: jest.fn(),
      all: jest.fn().mockResolvedValue([]),
      locator: jest.fn(),
    };
    _nullLocator.first.mockReturnValue(_nullLocator);
    _nullLocator.locator.mockReturnValue(_nullLocator);
  }
  return _nullLocator;
}

function createMockLocator(
  overrides: Partial<{
    count: number;
    textContent: string | null;
    all: any[];
  }> = {},
) {
  const mockLocator: any = {
    count: jest.fn().mockResolvedValue(overrides.count ?? 0),
    textContent: jest.fn().mockResolvedValue(overrides.textContent ?? ''),
    first: jest.fn(),
    all: jest.fn().mockResolvedValue(overrides.all ?? []),
    locator: jest.fn().mockReturnValue(getNullLocator()),
  };
  mockLocator.first.mockReturnValue(mockLocator);
  return mockLocator;
}

function createMockPage(locatorMap: Record<string, any> = {}) {
  const defaultLocator = createMockLocator();
  return {
    locator: jest.fn(
      (selector: string) => locatorMap[selector] || defaultLocator,
    ),
    getByText: jest.fn().mockReturnValue(createMockLocator()),
    goto: jest.fn(),
    waitForSelector: jest.fn(),
    screenshot: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
  };
}

function makeCheck(
  overrides: Partial<UiCheckDefinition> = {},
): UiCheckDefinition {
  return {
    type: 'element_exists',
    description: 'Test check',
    ...overrides,
  };
}

// ==================== Test Config ====================

const TEST_CONFIG = {
  auth: {
    loginUrl: '${UI_CHECK_LOGIN_URL}',
    usernameSelector: '#user',
    passwordSelector: '#pass',
    submitSelector: 'button',
    successIndicator: '.success',
    storageStatePath: './test-state.json',
  },
  defaults: {
    timeout: 5000,
    waitForSelector: 'body',
    viewport: { width: 1920, height: 1080 },
  },
  targets: [
    {
      id: 'test-target',
      name: 'Test Target',
      url: 'http://test.com',
      checks: [
        {
          type: 'no_empty_page',
          minContentLength: 100,
          description: 'test check',
        },
      ],
    },
  ],
};

// ==================== Test Suite ====================

describe('UiCheckService', () => {
  let service: UiCheckService;
  let configService: ConfigService;
  let prismaService: PrismaService;
  let slackService: SlackNotificationService;
  let externalDbService: ExternalDbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UiCheckService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            uiCheckHistory: {
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
              findUnique: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({}),
            },
          },
        },
        {
          provide: SlackNotificationService,
          useValue: {
            sendAlert: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ExternalDbService,
          useValue: {
            getTodayReportUuids: jest.fn().mockResolvedValue(new Map()),
          },
        },
      ],
    }).compile();

    service = module.get<UiCheckService>(UiCheckService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
    slackService = module.get<SlackNotificationService>(
      SlackNotificationService,
    );
    externalDbService = module.get<ExternalDbService>(ExternalDbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    _nullLocator = undefined;
  });

  // ==================== A. Rendering Check Types ====================

  describe('checkElementExists', () => {
    it('should pass when element is found', async () => {
      const page = createMockPage({
        '.my-element': createMockLocator({ count: 1 }),
      });
      const check = makeCheck({
        type: 'element_exists',
        selector: '.my-element',
        description: 'Element check',
      });

      const result: SingleCheckResult = await service['checkElementExists'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(result.category).toBe('rendering');
      expect(result.selector).toBe('.my-element');
      expect(page.locator).toHaveBeenCalledWith('.my-element');
    });

    it('should fail when element is not found', async () => {
      const page = createMockPage({
        '.missing': createMockLocator({ count: 0 }),
      });
      const check = makeCheck({
        type: 'element_exists',
        selector: '.missing',
        description: 'Missing element',
      });

      const result = await service['checkElementExists'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
      expect(result.message).toContain('not found');
    });

    it('should report multiple matches in message', async () => {
      const page = createMockPage({
        'div.card': createMockLocator({ count: 5 }),
      });
      const check = makeCheck({
        type: 'element_exists',
        selector: 'div.card',
        description: 'Multiple cards',
      });

      const result = await service['checkElementExists'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(result.message).toContain('5');
      expect(result.message).toContain('matches');
    });
  });

  describe('checkElementCountMin', () => {
    it('should pass when count meets minimum', async () => {
      const page = createMockPage({
        'li.item': createMockLocator({ count: 5 }),
      });
      const check = makeCheck({
        type: 'element_count_min',
        selector: 'li.item',
        minCount: 3,
        description: 'Min count check',
      });

      const result = await service['checkElementCountMin'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(result.category).toBe('rendering');
    });

    it('should fail when count is below minimum', async () => {
      const page = createMockPage({
        'li.item': createMockLocator({ count: 1 }),
      });
      const check = makeCheck({
        type: 'element_count_min',
        selector: 'li.item',
        minCount: 5,
        description: 'Min count check',
      });

      const result = await service['checkElementCountMin'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
      expect(result.message).toContain('expected at least 5');
    });

    it('should default minCount to 1 when not specified', async () => {
      const page = createMockPage({
        div: createMockLocator({ count: 1 }),
      });
      const check = makeCheck({
        type: 'element_count_min',
        selector: 'div',
        description: 'Default min',
      });

      const result = await service['checkElementCountMin'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
    });
  });

  describe('checkChartRendered', () => {
    it('should pass when chart elements found with default selector', async () => {
      const page = createMockPage({
        'canvas, svg.recharts-surface': createMockLocator({ count: 2 }),
      });
      const check = makeCheck({
        type: 'chart_rendered',
        description: 'Chart rendered',
      });

      const result = await service['checkChartRendered'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(result.category).toBe('rendering');
      expect(page.locator).toHaveBeenCalledWith('canvas, svg.recharts-surface');
    });

    it('should use custom selector when provided', async () => {
      const page = createMockPage({
        '.highcharts-container': createMockLocator({ count: 1 }),
      });
      const check = makeCheck({
        type: 'chart_rendered',
        selector: '.highcharts-container',
        description: 'Custom chart',
      });

      const result = await service['checkChartRendered'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(page.locator).toHaveBeenCalledWith('.highcharts-container');
    });

    it('should fail when no chart elements found', async () => {
      const page = createMockPage();
      const check = makeCheck({
        type: 'chart_rendered',
        description: 'No charts',
      });

      const result = await service['checkChartRendered'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
    });
  });

  describe('checkNoEmptyPage', () => {
    it('should pass when page has sufficient content', async () => {
      const longText = 'A'.repeat(200);
      const page = createMockPage({
        body: createMockLocator({ textContent: longText }),
      });
      const check = makeCheck({
        type: 'no_empty_page',
        minContentLength: 100,
        description: 'Not empty check',
      });

      const result = await service['checkNoEmptyPage'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(result.category).toBe('rendering');
    });

    it('should fail when page content is too short', async () => {
      const page = createMockPage({
        body: createMockLocator({ textContent: 'Short' }),
      });
      const check = makeCheck({
        type: 'no_empty_page',
        minContentLength: 100,
        description: 'Empty page',
      });

      const result = await service['checkNoEmptyPage'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
      expect(result.message).toContain('empty');
    });

    it('should default minContentLength to 100', async () => {
      const page = createMockPage({
        body: createMockLocator({ textContent: 'A'.repeat(99) }),
      });
      const check = makeCheck({
        type: 'no_empty_page',
        description: 'Default min content',
      });

      const result = await service['checkNoEmptyPage'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
    });

    it('should handle null textContent gracefully', async () => {
      const page = createMockPage({
        body: createMockLocator({ textContent: null }),
      });
      const check = makeCheck({
        type: 'no_empty_page',
        description: 'Null body',
      });

      const result = await service['checkNoEmptyPage'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
    });
  });

  // ==================== B. Error Check Types ====================

  describe('checkNoErrorText', () => {
    it('should pass when no error patterns match', async () => {
      const page = createMockPage({
        body: createMockLocator({
          textContent: 'Everything is fine. Data loaded.',
        }),
      });
      const check = makeCheck({
        type: 'no_error_text',
        patterns: ['error', 'exception', 'failed'],
        description: 'No error text',
      });

      const result = await service['checkNoErrorText'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(result.category).toBe('error');
    });

    it('should fail when error patterns are found (case insensitive)', async () => {
      const page = createMockPage({
        body: createMockLocator({
          textContent: 'An ERROR occurred in the system',
        }),
      });
      const check = makeCheck({
        type: 'no_error_text',
        patterns: ['error', 'exception'],
        description: 'Error text detected',
      });

      const result = await service['checkNoErrorText'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
      expect(result.message).toContain('error');
    });

    it('should handle empty patterns array', async () => {
      const page = createMockPage({
        body: createMockLocator({ textContent: 'Any text' }),
      });
      const check = makeCheck({
        type: 'no_error_text',
        patterns: [],
        description: 'No patterns',
      });

      const result = await service['checkNoErrorText'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
    });

    it('should report all matching patterns', async () => {
      const page = createMockPage({
        body: createMockLocator({
          textContent: 'Error: Something failed with an exception',
        }),
      });
      const check = makeCheck({
        type: 'no_error_text',
        patterns: ['error', 'failed', 'exception'],
        description: 'Multiple matches',
      });

      const result = await service['checkNoErrorText'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
      expect(result.message).toContain('error');
      expect(result.message).toContain('failed');
      expect(result.message).toContain('exception');
    });
  });

  describe('checkNoConsoleErrors', () => {
    it('should pass when no console errors', () => {
      const check = makeCheck({
        type: 'no_console_errors',
        description: 'No console errors',
      });

      const result = service['checkNoConsoleErrors'](check, [], Date.now());

      expect(result.status).toBe('pass');
      expect(result.category).toBe('error');
    });

    it('should fail when console errors exist', () => {
      const errors = ['Uncaught TypeError: x is undefined', 'Network error'];
      const check = makeCheck({
        type: 'no_console_errors',
        description: 'Console errors present',
      });

      const result = service['checkNoConsoleErrors'](check, errors, Date.now());

      expect(result.status).toBe('fail');
      expect(result.message).toContain('2 console error(s)');
    });

    it('should show only first 3 errors in message', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3', 'Error 4', 'Error 5'];
      const check = makeCheck({
        type: 'no_console_errors',
        description: 'Many errors',
      });

      const result = service['checkNoConsoleErrors'](check, errors, Date.now());

      expect(result.status).toBe('fail');
      expect(result.message).toContain('5 console error(s)');
      // Should contain first 3 errors joined by '; '
      expect(result.message).toContain('Error 1');
      expect(result.message).toContain('Error 3');
      expect(result.message).not.toContain('Error 4');
    });

    it('is synchronous (returns SingleCheckResult, not Promise)', () => {
      const check = makeCheck({
        type: 'no_console_errors',
        description: 'Sync check',
      });

      const result = service['checkNoConsoleErrors'](check, [], Date.now());

      // Should not be a Promise
      expect(result).not.toBeInstanceOf(Promise);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== C. Structure & Content Check Types ====================

  describe('checkSectionExists', () => {
    it('should return array of results (one per section)', async () => {
      const sectionLocator = createMockLocator({ count: 1 });
      const page = createMockPage({
        '.section-a': sectionLocator,
        '.section-b': createMockLocator({ count: 0 }),
      });
      const check = makeCheck({
        type: 'section_exists',
        description: 'Section check',
        sections: [
          { name: 'Section A', sectionSelector: '.section-a' },
          {
            name: 'Section B',
            sectionSelector: '.section-b',
            headingText: 'Section B Title',
          },
        ],
      });

      // Mock getByText fallback for Section B
      const textLocator = createMockLocator({ count: 1 });
      page.getByText.mockReturnValue(textLocator);

      const results = await service['checkSectionExists'](
        page as any,
        check,
        Date.now(),
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('pass');
      expect(results[0].category).toBe('structure');
      // Section B: sectionSelector count=0, falls back to headingText
      expect(results[1].status).toBe('pass');
    });

    it('should return empty array when no sections defined', async () => {
      const page = createMockPage();
      const check = makeCheck({
        type: 'section_exists',
        description: 'No sections',
      });

      const results = await service['checkSectionExists'](
        page as any,
        check,
        Date.now(),
      );

      expect(results).toEqual([]);
    });

    it('should skip sectionSelector when value is "..."', async () => {
      const page = createMockPage();
      const textLocator = createMockLocator({ count: 1 });
      page.getByText.mockReturnValue(textLocator);

      const check = makeCheck({
        type: 'section_exists',
        description: 'Ellipsis selector',
        sections: [
          {
            name: 'Intro',
            sectionSelector: '...',
            headingText: 'Introduction',
          },
        ],
      });

      const results = await service['checkSectionExists'](
        page as any,
        check,
        Date.now(),
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('pass');
      // Should NOT have called locator with '...'
      expect(page.locator).not.toHaveBeenCalledWith('...');
      expect(page.getByText).toHaveBeenCalledWith('Introduction', {
        exact: false,
      });
    });

    it('should fail section when neither selector nor text finds it', async () => {
      const page = createMockPage({
        '.missing': createMockLocator({ count: 0 }),
      });
      page.getByText.mockReturnValue(createMockLocator({ count: 0 }));

      const check = makeCheck({
        type: 'section_exists',
        description: 'Missing section',
        sections: [
          {
            name: 'Ghost',
            sectionSelector: '.missing',
            headingText: 'Ghost Title',
          },
        ],
      });

      const results = await service['checkSectionExists'](
        page as any,
        check,
        Date.now(),
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('fail');
      expect(results[0].message).toContain('누락');
    });
  });

  describe('checkTableStructure', () => {
    it('should pass when table has enough rows', async () => {
      const tableLocator = createMockLocator({ count: 1 });
      const tbodyTrLocator = createMockLocator({ count: 5 });
      tableLocator.locator.mockImplementation((sel: string) => {
        if (sel === 'tbody tr') return tbodyTrLocator;
        return createMockLocator();
      });
      tableLocator.first.mockReturnValue(tableLocator);

      const page = createMockPage({ 'table.data': tableLocator });
      const check = makeCheck({
        type: 'table_structure',
        selector: 'table.data',
        minCount: 3,
        description: 'Table rows check',
      });

      const result = await service['checkTableStructure'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(result.category).toBe('structure');
    });

    it('should fail when table has too few rows', async () => {
      const tableLocator = createMockLocator({ count: 1 });
      const tbodyTrLocator = createMockLocator({ count: 1 });
      tableLocator.locator.mockImplementation((sel: string) => {
        if (sel === 'tbody tr') return tbodyTrLocator;
        return createMockLocator();
      });
      tableLocator.first.mockReturnValue(tableLocator);

      const page = createMockPage({ table: tableLocator });
      const check = makeCheck({
        type: 'table_structure',
        selector: 'table',
        minCount: 5,
        description: 'Too few rows',
      });

      const result = await service['checkTableStructure'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
    });

    it('should return error when selector is "..."', async () => {
      const page = createMockPage();
      const check = makeCheck({
        type: 'table_structure',
        selector: '...',
        description: 'Unconfigured table',
      });

      const result = await service['checkTableStructure'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('error');
      expect(result.message).toContain('셀렉터 미설정');
    });

    it('should fail when table does not exist', async () => {
      const tableLocator = createMockLocator({ count: 0 });
      tableLocator.first.mockReturnValue(tableLocator);
      const page = createMockPage({ 'table.missing': tableLocator });

      const check = makeCheck({
        type: 'table_structure',
        selector: 'table.missing',
        description: 'Missing table',
      });

      const result = await service['checkTableStructure'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
      expect(result.message).toContain('미발견');
    });

    it('should check column count when minColumns specified', async () => {
      const tableLocator = createMockLocator({ count: 1 });
      const tbodyTrLocator = createMockLocator({ count: 3 });
      const colLocator = createMockLocator({ count: 2 });
      tableLocator.locator.mockImplementation((sel: string) => {
        if (sel === 'tbody tr') return tbodyTrLocator;
        if (sel === 'thead th, tbody tr:first-child td') return colLocator;
        return createMockLocator();
      });
      tableLocator.first.mockReturnValue(tableLocator);

      const page = createMockPage({ table: tableLocator });
      const check = makeCheck({
        type: 'table_structure',
        selector: 'table',
        minCount: 1,
        minColumns: 5,
        description: 'Column count check',
      });

      const result = await service['checkTableStructure'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
    });
  });

  describe('checkNoEmptyCells', () => {
    it('should return error when selector is "..."', async () => {
      const page = createMockPage();
      const check = makeCheck({
        type: 'no_empty_cells',
        selector: '...',
        description: 'Unconfigured',
      });

      const result = await service['checkNoEmptyCells'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('error');
      expect(result.category).toBe('content');
    });

    it('should pass when no empty cells found', async () => {
      const cell1 = { textContent: jest.fn().mockResolvedValue('데이터1') };
      const cell2 = { textContent: jest.fn().mockResolvedValue('100') };
      const cell3 = { textContent: jest.fn().mockResolvedValue('2026-01-01') };

      const row = {
        locator: jest.fn().mockReturnValue({
          all: jest.fn().mockResolvedValue([cell1, cell2, cell3]),
        }),
      };

      const rowsLocator = createMockLocator({ all: [row] });
      const page = createMockPage({ 'table tbody tr': rowsLocator });
      const check = makeCheck({
        type: 'no_empty_cells',
        selector: 'table',
        description: 'No empty cells',
      });

      const result = await service['checkNoEmptyCells'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(result.category).toBe('content');
    });

    it('should fail when empty cells found and track positions', async () => {
      const cell1 = { textContent: jest.fn().mockResolvedValue('유효') };
      const cell2 = { textContent: jest.fn().mockResolvedValue('-') }; // empty pattern
      const cell3 = { textContent: jest.fn().mockResolvedValue('N/A') }; // empty pattern

      const row = {
        locator: jest.fn().mockReturnValue({
          all: jest.fn().mockResolvedValue([cell1, cell2, cell3]),
        }),
      };

      // The actual code calls page.locator(`${selector} tbody tr`).all()
      const rowsLocator = createMockLocator({ all: [row] });

      const page = createMockPage({ 'table tbody tr': rowsLocator });
      const check = makeCheck({
        type: 'no_empty_cells',
        selector: 'table',
        maxEmptyCells: 0,
        description: 'Empty cell check',
      });

      const result = await service['checkNoEmptyCells'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
      expect(result.details).toBeDefined();
      expect((result.details as any).emptyCellCount).toBe(2);
      expect((result.details as any).emptyPositions).toContain('row1:col2');
      expect((result.details as any).emptyPositions).toContain('row1:col3');
    });

    it('should pass when empty cells within maxEmptyCells tolerance', async () => {
      const cell1 = { textContent: jest.fn().mockResolvedValue('유효') };
      const cell2 = { textContent: jest.fn().mockResolvedValue('-') };

      const row = {
        locator: jest.fn().mockReturnValue({
          all: jest.fn().mockResolvedValue([cell1, cell2]),
        }),
      };

      const rowsLocator = createMockLocator({ all: [row] });
      const page = createMockPage({ 'table tbody tr': rowsLocator });
      const check = makeCheck({
        type: 'no_empty_cells',
        selector: 'table',
        maxEmptyCells: 3,
        description: 'Tolerant check',
      });

      const result = await service['checkNoEmptyCells'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
    });

    it('should only check specified columnIndices', async () => {
      const cell0 = { textContent: jest.fn().mockResolvedValue('-') }; // col 0 - empty but NOT checked
      const cell1 = { textContent: jest.fn().mockResolvedValue('유효') }; // col 1 - checked, valid
      const cell2 = { textContent: jest.fn().mockResolvedValue('유효') }; // col 2 - not checked

      const row = {
        locator: jest.fn().mockReturnValue({
          all: jest.fn().mockResolvedValue([cell0, cell1, cell2]),
        }),
      };

      const rowsLocator = createMockLocator({ all: [row] });
      const page = createMockPage({ 'table tbody tr': rowsLocator });
      const check = makeCheck({
        type: 'no_empty_cells',
        selector: 'table',
        columnIndices: [1], // only check column 1
        description: 'Column filter check',
      });

      const result = await service['checkNoEmptyCells'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
    });
  });

  describe('checkContentNotEmpty', () => {
    it('should pass when content meets minimum length', async () => {
      const containerLocator = createMockLocator({
        count: 1,
        textContent: 'A'.repeat(100),
      });
      containerLocator.first.mockReturnValue(containerLocator);
      const page = createMockPage({ '.content': containerLocator });

      const check = makeCheck({
        type: 'content_not_empty',
        selector: '.content',
        minContentLength: 50,
        description: 'Content check',
      });

      const result = await service['checkContentNotEmpty'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
      expect(result.category).toBe('content');
    });

    it('should fail when content is too short', async () => {
      const containerLocator = createMockLocator({
        count: 1,
        textContent: 'Short',
      });
      containerLocator.first.mockReturnValue(containerLocator);
      const page = createMockPage({ '.content': containerLocator });

      const check = makeCheck({
        type: 'content_not_empty',
        selector: '.content',
        minContentLength: 50,
        description: 'Too short',
      });

      const result = await service['checkContentNotEmpty'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
    });

    it('should return error when selector is "..."', async () => {
      const page = createMockPage();
      const check = makeCheck({
        type: 'content_not_empty',
        selector: '...',
        description: 'Unconfigured content',
      });

      const result = await service['checkContentNotEmpty'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('error');
      expect(result.message).toContain('셀렉터 미설정');
    });

    it('should fail when container does not exist', async () => {
      const containerLocator = createMockLocator({ count: 0 });
      containerLocator.first.mockReturnValue(containerLocator);
      const page = createMockPage({ '.missing': containerLocator });

      const check = makeCheck({
        type: 'content_not_empty',
        selector: '.missing',
        description: 'Missing container',
      });

      const result = await service['checkContentNotEmpty'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
      expect(result.message).toContain('미발견');
    });

    it('should check item count when itemSelector and minItems specified', async () => {
      const itemLocator = createMockLocator({ count: 2 });
      const containerLocator = createMockLocator({
        count: 1,
        textContent: 'A'.repeat(100),
      });
      containerLocator.first.mockReturnValue(containerLocator);
      containerLocator.locator.mockImplementation((sel: string) => {
        if (sel === '.item') return itemLocator;
        return createMockLocator();
      });

      const page = createMockPage({ '.content': containerLocator });
      const check = makeCheck({
        type: 'content_not_empty',
        selector: '.content',
        minContentLength: 50,
        itemSelector: '.item',
        minItems: 5,
        description: 'Too few items',
      });

      const result = await service['checkContentNotEmpty'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('fail');
    });

    it('should pass when both length and item count meet requirements', async () => {
      const itemLocator = createMockLocator({ count: 10 });
      const containerLocator = createMockLocator({
        count: 1,
        textContent: 'A'.repeat(100),
      });
      containerLocator.first.mockReturnValue(containerLocator);
      containerLocator.locator.mockImplementation((sel: string) => {
        if (sel === '.item') return itemLocator;
        return createMockLocator();
      });

      const page = createMockPage({ '.content': containerLocator });
      const check = makeCheck({
        type: 'content_not_empty',
        selector: '.content',
        minContentLength: 50,
        itemSelector: '.item',
        minItems: 5,
        description: 'All good',
      });

      const result = await service['checkContentNotEmpty'](
        page as any,
        check,
        Date.now(),
      );

      expect(result.status).toBe('pass');
    });
  });

  // ==================== D. Dispatcher (runSingleCheck) ====================

  describe('runSingleCheck', () => {
    it('should dispatch element_exists correctly', async () => {
      const page = createMockPage({
        '.el': createMockLocator({ count: 1 }),
      });
      const check = makeCheck({
        type: 'element_exists',
        selector: '.el',
        description: 'Dispatch test',
      });

      const result = await service['runSingleCheck'](page as any, check, []);

      expect(result).toBeDefined();
      expect((result as SingleCheckResult).type).toBe('element_exists');
    });

    it('should dispatch no_console_errors correctly', async () => {
      const page = createMockPage();
      const check = makeCheck({
        type: 'no_console_errors',
        description: 'Console dispatch',
      });

      const result = await service['runSingleCheck'](page as any, check, [
        'Error!',
      ]);

      expect((result as SingleCheckResult).type).toBe('no_console_errors');
      expect((result as SingleCheckResult).status).toBe('fail');
    });

    it('should dispatch section_exists and return array', async () => {
      const page = createMockPage({
        '.sec': createMockLocator({ count: 1 }),
      });
      const check = makeCheck({
        type: 'section_exists',
        description: 'Section dispatch',
        sections: [{ name: 'S1', sectionSelector: '.sec' }],
      });

      const result = await service['runSingleCheck'](page as any, check, []);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return error for unknown check type', async () => {
      const page = createMockPage();
      const check = makeCheck({
        type: 'unknown_type' as UiCheckType,
        description: 'Unknown type',
      });

      const result = await service['runSingleCheck'](page as any, check, []);

      expect((result as SingleCheckResult).status).toBe('error');
      expect((result as SingleCheckResult).message).toContain(
        'Unknown check type',
      );
    });

    it('should catch thrown errors and return error result', async () => {
      const page = createMockPage();
      // Force locator to throw
      page.locator.mockImplementation(() => {
        throw new Error('Playwright crashed');
      });

      const check = makeCheck({
        type: 'element_exists',
        selector: '.boom',
        description: 'Crash test',
      });

      const result = await service['runSingleCheck'](page as any, check, []);

      expect((result as SingleCheckResult).status).toBe('error');
      expect((result as SingleCheckResult).message).toContain(
        'Playwright crashed',
      );
    });
  });

  // ==================== E. Status Determination ====================

  describe('determineTargetStatus', () => {
    it('should return "healthy" when all checks pass', () => {
      const checks: SingleCheckResult[] = [
        {
          type: 'element_exists',
          description: 'a',
          status: 'pass',
          durationMs: 10,
        },
        {
          type: 'no_empty_page',
          description: 'b',
          status: 'pass',
          durationMs: 10,
        },
        {
          type: 'chart_rendered',
          description: 'c',
          status: 'pass',
          durationMs: 10,
        },
      ];

      const status = service['determineTargetStatus'](checks);

      expect(status).toBe('healthy');
    });

    it('should return "broken" for empty checks array', () => {
      const status = service['determineTargetStatus']([]);

      expect(status).toBe('broken');
    });

    it('should return "broken" when error status present', () => {
      const checks: SingleCheckResult[] = [
        {
          type: 'element_exists',
          description: 'a',
          status: 'pass',
          durationMs: 10,
        },
        {
          type: 'no_empty_page',
          description: 'b',
          status: 'error',
          durationMs: 10,
        },
      ];

      const status = service['determineTargetStatus'](checks);

      expect(status).toBe('broken');
    });

    it('should return "broken" when timeout status present', () => {
      const checks: SingleCheckResult[] = [
        {
          type: 'element_exists',
          description: 'a',
          status: 'pass',
          durationMs: 10,
        },
        {
          type: 'chart_rendered',
          description: 'b',
          status: 'timeout',
          durationMs: 10,
        },
      ];

      const status = service['determineTargetStatus'](checks);

      expect(status).toBe('broken');
    });

    it('should return "broken" when failed+error > 50% of checks', () => {
      const checks: SingleCheckResult[] = [
        {
          type: 'element_exists',
          description: 'a',
          status: 'pass',
          durationMs: 10,
        },
        {
          type: 'no_empty_page',
          description: 'b',
          status: 'fail',
          durationMs: 10,
        },
        {
          type: 'chart_rendered',
          description: 'c',
          status: 'fail',
          durationMs: 10,
        },
      ];

      const status = service['determineTargetStatus'](checks);

      expect(status).toBe('broken');
    });

    it('should return "degraded" when some fail but not over 50%', () => {
      const checks: SingleCheckResult[] = [
        {
          type: 'element_exists',
          description: 'a',
          status: 'pass',
          durationMs: 10,
        },
        {
          type: 'no_empty_page',
          description: 'b',
          status: 'pass',
          durationMs: 10,
        },
        {
          type: 'chart_rendered',
          description: 'c',
          status: 'pass',
          durationMs: 10,
        },
        {
          type: 'no_error_text',
          description: 'd',
          status: 'fail',
          durationMs: 10,
        },
      ];

      const status = service['determineTargetStatus'](checks);

      expect(status).toBe('degraded');
    });
  });

  // ==================== F. Config Loading ====================

  describe('loadConfig', () => {
    it('should load and parse config file', async () => {
      const configJson = JSON.stringify(TEST_CONFIG);
      jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(configJson);

      const config = await service['loadConfig']();

      expect(config.targets).toHaveLength(1);
      expect(config.targets[0].id).toBe('test-target');
      expect(config.defaults.timeout).toBe(5000);
    });

    it('should substitute environment variables', async () => {
      const configJson = JSON.stringify(TEST_CONFIG);
      jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(configJson);
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'UI_CHECK_LOGIN_URL') return 'https://login.example.com';
        return undefined;
      });

      const config = await service['loadConfig']();

      expect(config.auth.loginUrl).toBe('https://login.example.com');
    });

    it('should use empty string for missing env vars', async () => {
      const configJson = JSON.stringify(TEST_CONFIG);
      jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(configJson);
      (configService.get as jest.Mock).mockReturnValue(undefined);

      const config = await service['loadConfig']();

      expect(config.auth.loginUrl).toBe('');
    });

    it('should throw when config file not found', async () => {
      jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('ENOENT'));

      await expect(service['loadConfig']()).rejects.toThrow(
        'UI check config not found',
      );
    });

    it('should throw on invalid JSON', async () => {
      jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('not json {{{');

      await expect(service['loadConfig']()).rejects.toThrow(
        'Failed to parse UI check config',
      );
    });
  });

  // ==================== G. updateCheckConfig ====================

  describe('updateCheckConfig', () => {
    const savedConfig = {
      auth: TEST_CONFIG.auth,
      defaults: TEST_CONFIG.defaults,
      targets: [
        {
          id: 'target-1',
          name: 'Target 1',
          url: 'http://test.com',
          checks: [
            {
              type: 'no_empty_page',
              description: 'Page check',
              minContentLength: 100,
            },
            { type: 'element_exists', description: 'Element', selector: '.el' },
          ],
        },
      ],
    };

    beforeEach(() => {
      // Mock for updateCheckConfig's async fs usage
      jest
        .spyOn(fs.promises, 'readFile')
        .mockResolvedValue(JSON.stringify(savedConfig));
      jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      // Mock for getCheckConfig's loadConfig call
      jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
    });

    it('should update editable fields', async () => {
      const result = await service.updateCheckConfig({
        targetId: 'target-1',
        checkIndex: 0,
        values: { minContentLength: 200, description: 'Updated' },
      });

      expect(fs.promises.writeFile).toHaveBeenCalled();
      const writtenData = JSON.parse(
        (fs.promises.writeFile as jest.Mock).mock.calls[0][1],
      );
      expect(writtenData.targets[0].checks[0].minContentLength).toBe(200);
      expect(writtenData.targets[0].checks[0].description).toBe('Updated');
    });

    it('should throw NotFoundException for invalid targetId', async () => {
      await expect(
        service.updateCheckConfig({
          targetId: 'non-existent',
          checkIndex: 0,
          values: { minContentLength: 50 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid checkIndex', async () => {
      await expect(
        service.updateCheckConfig({
          targetId: 'target-1',
          checkIndex: 99,
          values: { minContentLength: 50 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative checkIndex', async () => {
      await expect(
        service.updateCheckConfig({
          targetId: 'target-1',
          checkIndex: -1,
          values: { minContentLength: 50 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-editable fields', async () => {
      await expect(
        service.updateCheckConfig({
          targetId: 'target-1',
          checkIndex: 0,
          values: { type: 'element_exists' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for selector (non-editable)', async () => {
      await expect(
        service.updateCheckConfig({
          targetId: 'target-1',
          checkIndex: 0,
          values: { selector: '.new-selector' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow editing patterns field', async () => {
      await service.updateCheckConfig({
        targetId: 'target-1',
        checkIndex: 0,
        values: { patterns: ['error', 'fail'] },
      });

      const writtenData = JSON.parse(
        (fs.promises.writeFile as jest.Mock).mock.calls[0][1],
      );
      expect(writtenData.targets[0].checks[0].patterns).toEqual([
        'error',
        'fail',
      ]);
    });
  });

  // ==================== H. Public API ====================

  describe('isEnabled', () => {
    it('should return true when UI_CHECK_ENABLED is "true"', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'UI_CHECK_ENABLED') return 'true';
        return undefined;
      });

      expect(service.isEnabled()).toBe(true);
    });

    it('should return true when UI_CHECK_ENABLED is "1"', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'UI_CHECK_ENABLED') return '1';
        return undefined;
      });

      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when UI_CHECK_ENABLED is not set', () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);

      expect(service.isEnabled()).toBe(false);
    });

    it('should return false when UI_CHECK_ENABLED is "false"', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'UI_CHECK_ENABLED') return 'false';
        return undefined;
      });

      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('getLastResult', () => {
    it('should return null initially', () => {
      expect(service.getLastResult()).toBeNull();
    });
  });

  describe('getCheckConfig', () => {
    it('should return config without auth info', async () => {
      jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      jest
        .spyOn(fs.promises, 'readFile')
        .mockResolvedValue(JSON.stringify(TEST_CONFIG));
      (configService.get as jest.Mock).mockReturnValue(undefined);

      const config = await service.getCheckConfig();

      expect(config.defaults).toBeDefined();
      expect(config.targets).toBeDefined();
      expect((config as any).auth).toBeUndefined();
      expect(config.targets[0].checks).toBeDefined();
      expect(config.targets[0].checksCount).toBe(1);
    });

    it('should map target fields correctly', async () => {
      jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      jest
        .spyOn(fs.promises, 'readFile')
        .mockResolvedValue(JSON.stringify(TEST_CONFIG));
      (configService.get as jest.Mock).mockReturnValue(undefined);

      const config = await service.getCheckConfig();

      expect(config.targets[0].id).toBe('test-target');
      expect(config.targets[0].name).toBe('Test Target');
    });
  });

  describe('getHealthStatus', () => {
    it('should return initial health status', () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);

      const status = service.getHealthStatus();

      expect(status.enabled).toBe(false);
      expect(status.isRunning).toBe(false);
      expect(status.lastCheckAt).toBeNull();
      expect(status.lastCheckHadIssues).toBeNull();
      expect(status.browserAvailable).toBe(true);
    });

    it('should reflect enabled state from config', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'UI_CHECK_ENABLED') return 'true';
        return undefined;
      });

      const status = service.getHealthStatus();

      expect(status.enabled).toBe(true);
    });
  });

  // ==================== I. Duration Tracking ====================

  describe('durationMs tracking', () => {
    it('should record positive durationMs for all check types', async () => {
      const page = createMockPage({
        body: createMockLocator({ textContent: 'A'.repeat(200) }),
        '.el': createMockLocator({ count: 1 }),
      });

      const elementResult = await service['checkElementExists'](
        page as any,
        makeCheck({
          type: 'element_exists',
          selector: '.el',
          description: 'e',
        }),
        Date.now() - 50,
      );
      expect(elementResult.durationMs).toBeGreaterThanOrEqual(0);

      const consoleResult = service['checkNoConsoleErrors'](
        makeCheck({ type: 'no_console_errors', description: 'c' }),
        [],
        Date.now() - 10,
      );
      expect(consoleResult.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
