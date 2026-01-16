import { Injectable, Logger } from '@nestjs/common';
import NodeCache from 'node-cache';

export enum CacheTTL {
  SHORT = 300, // 5분 - KPI, 실시간 메트릭
  MEDIUM = 900, // 15분 - 집계 데이터, 차트
  LONG = 3600, // 1시간 - 잘 변하지 않는 데이터
  HEALTH = 60, // 1분 - 헬스 체크
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache: NodeCache;
  private hits = 0;
  private misses = 0;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: CacheTTL.MEDIUM,
      checkperiod: 120,
      useClones: false,
      deleteOnExpire: true,
    });

    this.cache.on('expired', (key) => {
      this.logger.debug(`Cache expired: ${key}`);
    });

    this.logger.log('Cache service initialized');
  }

  /**
   * 캐시에서 값 조회 또는 없으면 fetcher 실행 후 캐시에 저장
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: CacheTTL = CacheTTL.MEDIUM,
  ): Promise<T> {
    const cached = this.cache.get<T>(key);

    if (cached !== undefined) {
      this.hits++;
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    this.misses++;
    this.logger.debug(`Cache MISS: ${key}, fetching...`);

    const value = await fetcher();
    this.cache.set(key, value, ttl);

    return value;
  }

  /**
   * 캐시에서 값 조회
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }
    return value;
  }

  /**
   * 캐시에 값 저장
   */
  set<T>(key: string, value: T, ttl: CacheTTL = CacheTTL.MEDIUM): boolean {
    return this.cache.set(key, value, ttl);
  }

  /**
   * 캐시에서 값 삭제
   */
  del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * 패턴에 맞는 모든 키 삭제
   */
  delByPattern(pattern: string): number {
    const keys = this.cache.keys();
    const matchingKeys = keys.filter((k) => k.includes(pattern));
    return this.cache.del(matchingKeys);
  }

  /**
   * 전체 캐시 초기화
   */
  flush(): void {
    this.cache.flushAll();
    this.logger.log('Cache flushed');
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      keys: this.cache.keys().length,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    };
  }

  /**
   * 캐시 키 생성 헬퍼
   */
  static generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }
}
