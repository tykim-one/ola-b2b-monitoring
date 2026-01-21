import { Injectable, Logger } from '@nestjs/common';
import { WindETLDataSource } from './wind-etl.datasource';
import { CacheService, CacheTTL } from '../cache/cache.service';
import {
  WindETLRun,
  WindETLSummary,
  WindETLTrend,
  WindETLError,
  WindETLFileStats,
  WindETLRecordStats,
} from './dto/wind-etl.dto';

/**
 * Wind ETL 모니터링 서비스
 * 캐싱 적용 래퍼
 */
@Injectable()
export class WindETLService {
  private readonly logger = new Logger(WindETLService.name);

  constructor(
    private readonly dataSource: WindETLDataSource,
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
  async getRecentRuns(limit = 50): Promise<WindETLRun[]> {
    const cacheKey = CacheService.generateKey('wind-etl', 'runs', limit);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getRecentRuns(limit),
      CacheTTL.SHORT,
    );
  }

  /**
   * 실행 현황 요약 (캐시 5분)
   */
  async getSummary(days = 7): Promise<WindETLSummary> {
    const cacheKey = CacheService.generateKey('wind-etl', 'summary', days);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getSummary(days),
      CacheTTL.SHORT,
    );
  }

  /**
   * 일별 트렌드 (캐시 15분)
   */
  async getDailyTrend(days = 30): Promise<WindETLTrend[]> {
    const cacheKey = CacheService.generateKey('wind-etl', 'trend', 'daily', days);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getDailyTrend(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 시간별 트렌드 (캐시 5분)
   */
  async getHourlyTrend(hours = 24): Promise<WindETLTrend[]> {
    const cacheKey = CacheService.generateKey('wind-etl', 'trend', 'hourly', hours);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getHourlyTrend(hours),
      CacheTTL.SHORT,
    );
  }

  /**
   * 에러 분석 (캐시 5분)
   */
  async getErrorAnalysis(days = 7): Promise<WindETLError[]> {
    const cacheKey = CacheService.generateKey('wind-etl', 'errors', days);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getErrorAnalysis(days),
      CacheTTL.SHORT,
    );
  }

  /**
   * 파일 처리 통계 (캐시 15분)
   */
  async getFileProcessingStats(days = 30): Promise<WindETLFileStats[]> {
    const cacheKey = CacheService.generateKey('wind-etl', 'stats', 'files', days);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getFileProcessingStats(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 레코드 처리 통계 (캐시 15분)
   */
  async getRecordStats(days = 30): Promise<WindETLRecordStats[]> {
    const cacheKey = CacheService.generateKey('wind-etl', 'stats', 'records', days);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getRecordStats(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 캐시 무효화
   */
  invalidateCache(): void {
    this.cacheService.delByPattern('wind-etl:');
    this.logger.log('Wind ETL cache invalidated');
  }
}
