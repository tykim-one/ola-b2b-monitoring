import { Injectable, Logger } from '@nestjs/common';
import { ReportType, ReportTarget, REPORT_TYPES } from './interfaces';
import { ExternalDbService } from './external-db.service';

/**
 * 타겟 로더 서비스 (DB 기반)
 * gold.target_* 테이블에서 검증 대상 심볼 목록을 로드
 */
@Injectable()
export class TargetLoaderService {
  private readonly logger = new Logger(TargetLoaderService.name);

  // 캐시 (메모리에 로드된 타겟)
  private readonly cache: Map<ReportType, ReportTarget[]> = new Map();

  constructor(private readonly externalDb: ExternalDbService) {}

  /**
   * 특정 리포트 타입의 타겟 목록 로드
   */
  async loadTargets(
    reportType: ReportType,
    forceReload = false,
  ): Promise<ReportTarget[]> {
    // 캐시 확인
    if (!forceReload && this.cache.has(reportType)) {
      return this.cache.get(reportType)!;
    }

    try {
      const targets = await this.externalDb.loadTargetsFromDb(reportType);

      if (targets.length === 0) {
        this.logger.warn(`No targets found for ${reportType} in DB`);
        return [];
      }

      // 캐시에 저장
      this.cache.set(reportType, targets);

      this.logger.log(
        `Loaded ${targets.length} targets for ${reportType} from gold.target_${reportType}`,
      );

      return targets;
    } catch (error) {
      this.logger.error(
        `Failed to load targets for ${reportType}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * 모든 리포트 타입의 타겟 로드
   */
  async loadAllTargets(): Promise<Map<ReportType, ReportTarget[]>> {
    const allTargets = new Map<ReportType, ReportTarget[]>();

    for (const reportType of REPORT_TYPES) {
      allTargets.set(reportType, await this.loadTargets(reportType));
    }

    return allTargets;
  }

  /**
   * 캐시 초기화
   */
  clearCache(reportType?: ReportType): void {
    if (reportType) {
      this.cache.delete(reportType);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 사용 가능한 타겟 테이블 목록
   */
  async listAvailableFiles(): Promise<
    Array<{ reportType: ReportType; filename: string }>
  > {
    const tables = await this.externalDb.listAvailableTargetTables();
    return tables.map((t) => ({
      reportType: t.reportType,
      filename: t.tableName,
    }));
  }
}
