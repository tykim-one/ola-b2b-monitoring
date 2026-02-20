import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';
import {
  ExistenceCheckResult,
  FreshnessCheckResult,
  CompletenessCheckResult,
  SymbolData,
  ReportTarget,
  ReportType,
} from './interfaces';
import { getRequiredFields, getAllFieldsToFetch } from './config';

type DbType = 'mysql' | 'postgresql';

@Injectable()
export class ExternalDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExternalDbService.name);
  private mysqlPool: mysql.Pool | null = null;
  private pgPool: PgPool | null = null;
  private dbType: DbType | null = null;
  private isEnabled = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeConnection();
  }

  async onModuleDestroy() {
    await this.closeConnection();
  }

  /**
   * DB 연결 초기화
   */
  private async initializeConnection(): Promise<void> {
    const dbType = this.normalizeDbType(
      this.configService.get<string>('REPORT_DB_TYPE'),
    );
    const host = this.normalizeValue(this.configService.get<string>('REPORT_DB_HOST'));
    const port = this.normalizePort(
      this.configService.get<string | number>('REPORT_DB_PORT'),
    );
    const user = this.normalizeValue(this.configService.get<string>('REPORT_DB_USER'));
    const password = this.normalizeValue(
      this.configService.get<string>('REPORT_DB_PASSWORD'),
    );
    const database = this.normalizeValue(
      this.configService.get<string>('REPORT_DB_NAME'),
    );

    // 필수 환경변수 체크
    if (!dbType || !host || !database) {
      this.logger.warn(
        'Report DB configuration incomplete. ' +
          'Set REPORT_DB_TYPE, REPORT_DB_HOST, REPORT_DB_NAME to enable.',
      );
      return;
    }

    try {
      if (dbType === 'mysql') {
        this.mysqlPool = mysql.createPool({
          host,
          port: port || 3306,
          user: user || 'root',
          password: password || '',
          database,
          waitForConnections: true,
          connectionLimit: 5,
          queueLimit: 0,
        });

        // 연결 테스트
        const connection = await this.mysqlPool.getConnection();
        await connection.ping();
        connection.release();

        this.dbType = 'mysql';
        this.isEnabled = true;
        this.logger.log(
          `Connected to MySQL: ${host}:${port || 3306}/${database}`,
        );
      } else if (dbType === 'postgresql') {
        this.pgPool = new PgPool({
          host,
          port: port || 5432,
          user: user || 'postgres',
          password: password || '',
          database,
          max: 5,
        });

        // 연결 테스트
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();

        this.dbType = 'postgresql';
        this.isEnabled = true;
        this.logger.log(
          `Connected to PostgreSQL: ${host}:${port || 5432}/${database}`,
        );
      } else {
        this.logger.warn(
          `Unsupported DB type: ${this.configService.get<string>('REPORT_DB_TYPE')}. Use 'mysql' or 'postgresql'.`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to connect to report DB: ${error.message}`);
      this.isEnabled = false;
    }
  }

  private normalizeValue(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private normalizeDbType(value: string | undefined): DbType | undefined {
    const normalized = value?.trim().toLowerCase();
    if (normalized === 'mysql' || normalized === 'postgresql') {
      return normalized;
    }
    return undefined;
  }

  private normalizePort(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  /**
   * DB 연결 종료
   */
  private async closeConnection(): Promise<void> {
    try {
      if (this.mysqlPool) {
        await this.mysqlPool.end();
        this.logger.log('MySQL connection pool closed');
      }
      if (this.pgPool) {
        await this.pgPool.end();
        this.logger.log('PostgreSQL connection pool closed');
      }
    } catch (error) {
      this.logger.error(`Error closing DB connection: ${error.message}`);
    }
  }

  /**
   * DB 연결 상태 확인
   */
  isConnected(): boolean {
    return this.isEnabled;
  }

  /**
   * 데이터 존재 여부 체크
   */
  async checkDataExists(
    table: string,
    symbols: string[],
    symbolColumn = 'symbol',
  ): Promise<ExistenceCheckResult> {
    if (!this.isEnabled || symbols.length === 0) {
      return { existing: [], missing: symbols };
    }

    try {
      const existingSymbols = await this.queryExistingSymbols(
        table,
        symbols,
        symbolColumn,
      );

      const existingSet = new Set(existingSymbols);
      const missing = symbols.filter((s) => !existingSet.has(s));

      return {
        existing: existingSymbols,
        missing,
      };
    } catch (error) {
      this.logger.error(`checkDataExists failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 데이터 신선도 체크
   */
  async checkDataFreshness(
    table: string,
    symbols: string[],
    symbolColumn = 'symbol',
    updatedAtColumn = 'updated_at',
  ): Promise<FreshnessCheckResult> {
    if (!this.isEnabled || symbols.length === 0) {
      return { fresh: [], stale: [], staleDetails: [] };
    }

    try {
      const data = await this.querySymbolsWithUpdatedAt(
        table,
        symbols,
        symbolColumn,
        updatedAtColumn,
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const fresh: string[] = [];
      const stale: string[] = [];
      const staleDetails: FreshnessCheckResult['staleDetails'] = [];

      for (const item of data) {
        const updatedDate = new Date(item.updatedAt);
        updatedDate.setHours(0, 0, 0, 0);

        if (updatedDate.getTime() >= today.getTime()) {
          fresh.push(item.symbol);
        } else {
          stale.push(item.symbol);
          const daysBehind = Math.floor(
            (today.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          staleDetails.push({
            symbol: item.symbol,
            updatedAt: item.updatedAt,
            daysBehind,
          });
        }
      }

      return { fresh, stale, staleDetails };
    } catch (error) {
      this.logger.error(`checkDataFreshness failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 데이터 완전성 체크 (NULL 체크 + 전날 비교)
   * @param table 테이블명
   * @param symbols 체크할 심볼 목록
   * @param reportType 리포트 타입 (필수 필드 결정에 사용)
   * @param symbolColumn 심볼 컬럼명
   */
  async checkDataCompleteness(
    table: string,
    symbols: string[],
    reportType: ReportType,
    symbolColumn = 'symbol',
  ): Promise<CompletenessCheckResult> {
    if (!this.isEnabled || symbols.length === 0) {
      return {
        complete: [],
        incomplete: [],
        suspicious: [],
        incompleteDetails: [],
        suspiciousDetails: [],
      };
    }

    try {
      const config = getRequiredFields(reportType);
      const fieldsToFetch = getAllFieldsToFetch(reportType);

      // 오늘 데이터와 어제 데이터 조회
      const data = await this.querySymbolsWithFieldsAndYesterday(
        table,
        symbols,
        symbolColumn,
        fieldsToFetch,
      );

      const complete: string[] = [];
      const incomplete: string[] = [];
      const suspicious: string[] = [];
      const incompleteDetails: CompletenessCheckResult['incompleteDetails'] =
        [];
      const suspiciousDetails: CompletenessCheckResult['suspiciousDetails'] =
        [];

      for (const item of data) {
        const missingFields: string[] = [];
        const unchangedFields: string[] = [];

        // 1. NULL 체크
        for (const field of config.nullCheck) {
          if (item.today[field] === null || item.today[field] === undefined) {
            missingFields.push(field);
          }
        }

        // 2. 전날 비교 (어제 데이터가 있는 경우만)
        if (item.yesterday) {
          for (const field of config.compareYesterday) {
            const todayVal = item.today[field];
            const yesterdayVal = item.yesterday[field];

            // 둘 다 존재하고 값이 동일하면 suspicious
            if (
              todayVal !== null &&
              todayVal !== undefined &&
              yesterdayVal !== null &&
              yesterdayVal !== undefined &&
              this.areValuesEqual(todayVal, yesterdayVal)
            ) {
              unchangedFields.push(field);
            }
          }
        }

        // 결과 분류
        if (missingFields.length > 0) {
          incomplete.push(item.symbol);
          incompleteDetails.push({ symbol: item.symbol, missingFields });
        } else if (unchangedFields.length > 0) {
          suspicious.push(item.symbol);
          suspiciousDetails.push({ symbol: item.symbol, unchangedFields });
        } else {
          complete.push(item.symbol);
        }
      }

      return {
        complete,
        incomplete,
        suspicious,
        incompleteDetails,
        suspiciousDetails,
      };
    } catch (error) {
      this.logger.error(`checkDataCompleteness failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 값 동일 비교 (타입에 따라 적절히 비교)
   */
  private areValuesEqual(val1: unknown, val2: unknown): boolean {
    // 날짜 비교
    if (val1 instanceof Date && val2 instanceof Date) {
      return val1.getTime() === val2.getTime();
    }
    // 숫자 비교 (소수점 오차 허용)
    if (typeof val1 === 'number' && typeof val2 === 'number') {
      return Math.abs(val1 - val2) < 0.0001;
    }
    // 문자열/기타 비교
    return String(val1) === String(val2);
  }

  /**
   * 심볼별 오늘/어제 데이터 조회 (내부 헬퍼)
   */
  private async querySymbolsWithFieldsAndYesterday(
    table: string,
    symbols: string[],
    symbolColumn: string,
    fields: string[],
  ): Promise<
    Array<{
      symbol: string;
      today: Record<string, unknown>;
      yesterday: Record<string, unknown> | null;
    }>
  > {
    if (this.dbType === 'mysql' && this.mysqlPool) {
      return this.queryMySqlWithYesterday(table, symbols, symbolColumn, fields);
    } else if (this.dbType === 'postgresql' && this.pgPool) {
      return this.queryPostgresWithYesterday(
        table,
        symbols,
        symbolColumn,
        fields,
      );
    }
    return [];
  }

  /**
   * MySQL: 오늘/어제 데이터 조회
   */
  private async queryMySqlWithYesterday(
    table: string,
    symbols: string[],
    symbolColumn: string,
    fields: string[],
  ): Promise<
    Array<{
      symbol: string;
      today: Record<string, unknown>;
      yesterday: Record<string, unknown> | null;
    }>
  > {
    const placeholders = symbols.map(() => '?').join(', ');
    const fieldList = fields.map((f) => `t.${f} as today_${f}`).join(', ');
    const yesterdayFieldList = fields
      .map((f) => `y.${f} as yesterday_${f}`)
      .join(', ');

    const [rows] = await this.mysqlPool!.execute<mysql.RowDataPacket[]>(
      `SELECT t.${symbolColumn} as symbol, ${fieldList}, ${yesterdayFieldList}
       FROM ?? t
       LEFT JOIN ?? y
         ON t.${symbolColumn} = y.${symbolColumn}
         AND DATE(y.updated_at) = DATE(t.updated_at) - INTERVAL 1 DAY
       WHERE t.${symbolColumn} IN (${placeholders})
         AND DATE(t.updated_at) = CURDATE()`,
      [table, table, ...symbols],
    );

    return rows.map((row: mysql.RowDataPacket) => {
      const today: Record<string, unknown> = {};
      const yesterday: Record<string, unknown> = {};
      let hasYesterday = false;

      for (const field of fields) {
        today[field] = row[`today_${field}`];
        if (row[`yesterday_${field}`] !== null) {
          yesterday[field] = row[`yesterday_${field}`];
          hasYesterday = true;
        }
      }

      return {
        symbol: row.symbol as string,
        today,
        yesterday: hasYesterday ? yesterday : null,
      };
    });
  }

  /**
   * PostgreSQL: 오늘/어제 데이터 조회
   */
  private async queryPostgresWithYesterday(
    table: string,
    symbols: string[],
    symbolColumn: string,
    fields: string[],
  ): Promise<
    Array<{
      symbol: string;
      today: Record<string, unknown>;
      yesterday: Record<string, unknown> | null;
    }>
  > {
    const placeholders = symbols.map((_, i) => `$${i + 1}`).join(', ');
    const tableRef = table.includes('.') ? table : this.escapeIdentifier(table);
    const fieldList = fields.map((f) => `t.${f} as "today_${f}"`).join(', ');
    const yesterdayFieldList = fields
      .map((f) => `y.${f} as "yesterday_${f}"`)
      .join(', ');

    const result = await this.pgPool!.query(
      `SELECT t.${symbolColumn} as symbol, ${fieldList}, ${yesterdayFieldList}
       FROM ${tableRef} t
       LEFT JOIN ${tableRef} y
         ON t.${symbolColumn} = y.${symbolColumn}
         AND DATE(y.updated_at AT TIME ZONE 'Asia/Seoul') = DATE(t.updated_at AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 day'
       WHERE t.${symbolColumn} IN (${placeholders})
         AND DATE(t.updated_at AT TIME ZONE 'Asia/Seoul') = (NOW() AT TIME ZONE 'Asia/Seoul')::date`,
      symbols,
    );

    return result.rows.map((row) => {
      const today: Record<string, unknown> = {};
      const yesterday: Record<string, unknown> = {};
      let hasYesterday = false;

      for (const field of fields) {
        today[field] = row[`today_${field}`];
        if (row[`yesterday_${field}`] !== null) {
          yesterday[field] = row[`yesterday_${field}`];
          hasYesterday = true;
        }
      }

      return {
        symbol: row.symbol as string,
        today,
        yesterday: hasYesterday ? yesterday : null,
      };
    });
  }

  /**
   * 특정 심볼의 상세 정보 조회
   */
  async getSymbolDetails(
    table: string,
    symbol: string,
    symbolColumn = 'symbol',
  ): Promise<SymbolData | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      if (this.dbType === 'mysql' && this.mysqlPool) {
        const [rows] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
          `SELECT * FROM ?? WHERE ?? = ? LIMIT 1`,
          [table, symbolColumn, symbol],
        );
        return rows.length > 0 ? (rows[0] as SymbolData) : null;
      } else if (this.dbType === 'postgresql' && this.pgPool) {
        const result = await this.pgPool.query(
          `SELECT * FROM ${this.escapeIdentifier(table)} WHERE ${this.escapeIdentifier(symbolColumn)} = $1 LIMIT 1`,
          [symbol],
        );
        return result.rows.length > 0 ? (result.rows[0] as SymbolData) : null;
      }
      return null;
    } catch (error) {
      this.logger.error(`getSymbolDetails failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 존재하는 심볼 목록 쿼리 (내부 헬퍼)
   * 심볼이 DB에 존재하는지만 체크 (신선도는 별도 체크)
   */
  private async queryExistingSymbols(
    table: string,
    symbols: string[],
    symbolColumn: string,
  ): Promise<string[]> {
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const placeholders = symbols.map(() => '?').join(', ');
      const [rows] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
        `SELECT DISTINCT ?? as symbol FROM ?? WHERE ?? IN (${placeholders})`,
        [symbolColumn, table, symbolColumn, ...symbols],
      );
      return rows.map((r: mysql.RowDataPacket) => r.symbol as string);
    } else if (this.dbType === 'postgresql' && this.pgPool) {
      const placeholders = symbols.map((_, i) => `$${i + 1}`).join(', ');
      // 스키마 포함 테이블명 처리 (gold.daily_item_info)
      const tableRef = table.includes('.')
        ? table
        : this.escapeIdentifier(table);
      const result = await this.pgPool.query(
        `SELECT DISTINCT ${this.escapeIdentifier(symbolColumn)} as symbol
         FROM ${tableRef}
         WHERE ${this.escapeIdentifier(symbolColumn)} IN (${placeholders})`,
        symbols,
      );
      return result.rows.map((r) => r.symbol as string);
    }
    return [];
  }

  /**
   * 심볼별 updated_at 조회 (내부 헬퍼)
   * updated_at 기준으로 신선도 체크
   */
  private async querySymbolsWithUpdatedAt(
    table: string,
    symbols: string[],
    symbolColumn: string,
    updatedAtColumn: string,
  ): Promise<Array<{ symbol: string; updatedAt: Date }>> {
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const placeholders = symbols.map(() => '?').join(', ');
      const [rows] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
        `SELECT ?? as symbol, MAX(??) as updatedAt
         FROM ??
         WHERE ?? IN (${placeholders})
         GROUP BY ??`,
        [
          symbolColumn,
          updatedAtColumn,
          table,
          symbolColumn,
          ...symbols,
          symbolColumn,
        ],
      );
      return rows.map((r: mysql.RowDataPacket) => ({
        symbol: r.symbol as string,
        updatedAt: new Date(r.updatedAt),
      }));
    } else if (this.dbType === 'postgresql' && this.pgPool) {
      const placeholders = symbols.map((_, i) => `$${i + 1}`).join(', ');
      // 스키마 포함 테이블명 처리 (gold.daily_item_info)
      const tableRef = table.includes('.')
        ? table
        : this.escapeIdentifier(table);
      const result = await this.pgPool.query(
        `SELECT ${this.escapeIdentifier(symbolColumn)} as symbol,
                MAX(${this.escapeIdentifier(updatedAtColumn)}) as "updatedAt"
         FROM ${tableRef}
         WHERE ${this.escapeIdentifier(symbolColumn)} IN (${placeholders})
         GROUP BY ${this.escapeIdentifier(symbolColumn)}`,
        symbols,
      );
      return result.rows.map((r) => ({
        symbol: r.symbol as string,
        updatedAt: new Date(r.updatedAt),
      }));
    }
    return [];
  }

  /**
   * PostgreSQL 식별자 이스케이프
   */
  private escapeIdentifier(identifier: string): string {
    // 간단한 SQL injection 방지 - 알파벳, 숫자, 언더스코어만 허용
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return `"${identifier}"`;
  }

  /**
   * 오늘 생성된 리포트의 UUID 조회 (UI 체크용)
   * gold.daily_content_list 테이블에서 theme별 UUID를 가져옴
   */
  async getTodayReportUuids(themes: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!this.isEnabled || themes.length === 0) return result;

    try {
      if (this.dbType === 'postgresql' && this.pgPool) {
        const query = `
          SELECT theme, uuid::text
          FROM gold.daily_content_list
          WHERE published_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date
            AND period_type = 'DAILY'
            AND theme = ANY($1)
        `;
        const res = await this.pgPool.query(query, [themes]);
        for (const row of res.rows) {
          result.set(row.theme, row.uuid);
        }
      } else if (this.dbType === 'mysql' && this.mysqlPool) {
        const placeholders = themes.map(() => '?').join(',');
        const query = `
          SELECT theme, uuid
          FROM gold.daily_content_list
          WHERE published_date = DATE(CONVERT_TZ(NOW(), 'UTC', 'Asia/Seoul'))
            AND period_type = 'DAILY'
            AND theme IN (${placeholders})
        `;
        const [rows] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
          query,
          themes,
        );
        for (const row of rows) {
          result.set(row.theme as string, row.uuid as string);
        }
      }

      this.logger.debug(
        `Resolved ${result.size} report UUIDs for themes: ${themes.join(', ')}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`getTodayReportUuids failed: ${error.message}`);
      return result;
    }
  }

  /**
   * 헬스 체크
   */
  async healthCheck(): Promise<{ connected: boolean; type: string | null }> {
    if (!this.isEnabled) {
      return { connected: false, type: null };
    }

    try {
      if (this.dbType === 'mysql' && this.mysqlPool) {
        const connection = await this.mysqlPool.getConnection();
        await connection.ping();
        connection.release();
      } else if (this.dbType === 'postgresql' && this.pgPool) {
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();
      }
      return { connected: true, type: this.dbType };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return { connected: false, type: this.dbType };
    }
  }

  /**
   * 타겟 테이블에서 심볼 목록 조회
   * gold.target_{reportType} 테이블에서 로드
   */
  async loadTargetsFromDb(reportType: ReportType): Promise<ReportTarget[]> {
    if (!this.isEnabled) {
      this.logger.warn('DB not connected, cannot load targets');
      return [];
    }

    const tableName = `target_${reportType}`;
    const schema = 'gold';
    // forex는 item_code 컬럼 사용
    const symbolColumn = reportType === 'forex' ? 'item_code' : 'symbol';

    try {
      if (this.dbType === 'mysql' && this.mysqlPool) {
        const [rows] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
          `SELECT ?? as symbol, display_name as displayName FROM ??.??`,
          [symbolColumn, schema, tableName],
        );
        return rows.map((r: mysql.RowDataPacket) => ({
          symbol: r.symbol as string,
          displayName: (r.displayName as string) || '',
        }));
      } else if (this.dbType === 'postgresql' && this.pgPool) {
        const result = await this.pgPool.query(
          `SELECT ${this.escapeIdentifier(symbolColumn)} as symbol,
                  display_name as "displayName"
           FROM ${this.escapeIdentifier(schema)}.${this.escapeIdentifier(tableName)}`,
        );
        return result.rows.map((r) => ({
          symbol: r.symbol as string,
          displayName: (r.displayName as string) || '',
        }));
      }
      return [];
    } catch (error) {
      this.logger.error(
        `Failed to load targets for ${reportType}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * 사용 가능한 타겟 테이블 목록 조회
   */
  async listAvailableTargetTables(): Promise<
    Array<{ reportType: ReportType; tableName: string }>
  > {
    if (!this.isEnabled) {
      return [];
    }

    const reportTypes: ReportType[] = [
      'ai_stock',
      'commodity',
      'forex',
      'dividend',
    ];
    const result: Array<{ reportType: ReportType; tableName: string }> = [];

    for (const reportType of reportTypes) {
      const tableName = `gold.target_${reportType}`;
      try {
        // 테이블 존재 여부 확인 (1행만 조회)
        if (this.dbType === 'postgresql' && this.pgPool) {
          await this.pgPool.query(
            `SELECT 1 FROM gold.${this.escapeIdentifier(`target_${reportType}`)} LIMIT 1`,
          );
          result.push({ reportType, tableName });
        } else if (this.dbType === 'mysql' && this.mysqlPool) {
          await this.mysqlPool.execute(`SELECT 1 FROM gold.?? LIMIT 1`, [
            `target_${reportType}`,
          ]);
          result.push({ reportType, tableName });
        }
      } catch {
        // 테이블이 없으면 스킵
        this.logger.debug(`Target table not found: ${tableName}`);
      }
    }

    return result;
  }
}
