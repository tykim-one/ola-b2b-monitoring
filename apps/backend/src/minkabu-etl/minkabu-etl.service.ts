import { Injectable, Logger } from '@nestjs/common';
import { MinkabuETLDataSource } from './minkabu-etl.datasource';
import { CacheService, CacheTTL } from '../cache/cache.service';
import {
  MinkabuETLRun,
  MinkabuETLSummary,
  MinkabuETLTrend,
  MinkabuETLError,
  MinkabuETLHeadlineStats,
  MinkabuETLIndexStats,
} from './dto/minkabu-etl.dto';

/**
 * Minkabu ETL 모니터링 서비스
 * 캐싱 적용 래퍼
 */
@Injectable()
export class MinkabuETLService {
  private readonly logger = new Logger(MinkabuETLService.name);

  constructor(
    private readonly dataSource: MinkabuETLDataSource,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 헬스 체크
   */
  async isHealthy(): Promise<boolean> {
    return this.dataSource.isHealthy();
  }

  /**
   * 최근 실행 목록 (캐시 5분)
   */
  async getRecentRuns(limit = 50): Promise<MinkabuETLRun[]> {
    const cacheKey = CacheService.generateKey('minkabu-etl', 'runs', limit);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getRecentRuns(limit),
      CacheTTL.SHORT,
    );
  }

  /**
   * 실행 현황 요약 (캐시 5분)
   */
  async getSummary(days = 7): Promise<MinkabuETLSummary> {
    const cacheKey = CacheService.generateKey('minkabu-etl', 'summary', days);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getSummary(days),
      CacheTTL.SHORT,
    );
  }

  /**
   * 일별 트렌드 (캐시 15분)
   */
  async getDailyTrend(days = 30): Promise<MinkabuETLTrend[]> {
    const cacheKey = CacheService.generateKey(
      'minkabu-etl',
      'trend',
      'daily',
      days,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getDailyTrend(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 시간별 트렌드 (캐시 5분)
   */
  async getHourlyTrend(hours = 24): Promise<MinkabuETLTrend[]> {
    const cacheKey = CacheService.generateKey(
      'minkabu-etl',
      'trend',
      'hourly',
      hours,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getHourlyTrend(hours),
      CacheTTL.SHORT,
    );
  }

  /**
   * 에러 분석 (캐시 5분)
   */
  async getErrorAnalysis(days = 7): Promise<MinkabuETLError[]> {
    const cacheKey = CacheService.generateKey('minkabu-etl', 'errors', days);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getErrorAnalysis(days),
      CacheTTL.SHORT,
    );
  }

  /**
   * 헤드라인 수집 통계 (캐시 15분)
   */
  async getHeadlineStats(days = 30): Promise<MinkabuETLHeadlineStats[]> {
    const cacheKey = CacheService.generateKey(
      'minkabu-etl',
      'stats',
      'headlines',
      days,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getHeadlineStats(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 인덱스 통계 (캐시 15분)
   */
  async getIndexStats(days = 30): Promise<MinkabuETLIndexStats[]> {
    const cacheKey = CacheService.generateKey(
      'minkabu-etl',
      'stats',
      'index',
      days,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getIndexStats(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 캐시 무효화
   */
  invalidateCache(): void {
    this.cacheService.delByPattern('minkabu-etl:');
    this.logger.log('Minkabu ETL cache invalidated');
  }
}
