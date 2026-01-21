import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinkabuETLController } from './minkabu-etl.controller';
import { MinkabuETLService } from './minkabu-etl.service';
import { MinkabuETLDataSource } from './minkabu-etl.datasource';
import { CacheModule } from '../cache/cache.module';

/**
 * Minkabu ETL 모니터링 모듈
 *
 * PostgreSQL (ops.jp_minkabu_etl_runs) 기반 뉴스 크롤링 ETL 모니터링
 *
 * API 엔드포인트:
 * - GET /api/minkabu-etl/health          - 헬스 체크
 * - GET /api/minkabu-etl/runs            - 최근 실행 목록
 * - GET /api/minkabu-etl/summary         - 실행 현황 요약
 * - GET /api/minkabu-etl/trend/daily     - 일별 트렌드
 * - GET /api/minkabu-etl/trend/hourly    - 시간별 트렌드
 * - GET /api/minkabu-etl/errors          - 에러 분석
 * - GET /api/minkabu-etl/stats/headlines - 헤드라인 수집 통계
 * - GET /api/minkabu-etl/stats/index     - 인덱스 통계
 *
 * 환경변수:
 * - MINKABU_PG_HOST
 * - MINKABU_PG_PORT
 * - MINKABU_PG_DATABASE
 * - MINKABU_PG_USER
 * - MINKABU_PG_PASSWORD
 */
@Module({
  imports: [ConfigModule, CacheModule],
  controllers: [MinkabuETLController],
  providers: [MinkabuETLDataSource, MinkabuETLService],
  exports: [MinkabuETLService],
})
export class MinkabuETLModule {}
