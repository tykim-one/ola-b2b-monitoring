import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WindETLController } from './wind-etl.controller';
import { WindETLService } from './wind-etl.service';
import { WindETLDataSource } from './wind-etl.datasource';
import { CacheModule } from '../cache/cache.module';

/**
 * Wind ETL 모니터링 모듈
 *
 * PostgreSQL (ops.cn_wind_etl_runs) 기반 파일 처리 ETL 모니터링
 *
 * API 엔드포인트:
 * - GET /api/wind-etl/health       - 헬스 체크
 * - GET /api/wind-etl/runs         - 최근 실행 목록
 * - GET /api/wind-etl/summary      - 실행 현황 요약
 * - GET /api/wind-etl/trend/daily  - 일별 트렌드
 * - GET /api/wind-etl/trend/hourly - 시간별 트렌드
 * - GET /api/wind-etl/errors       - 에러 분석
 * - GET /api/wind-etl/stats/files  - 파일 처리 통계
 * - GET /api/wind-etl/stats/records - 레코드 처리 통계
 *
 * 환경변수:
 * - WIND_PG_HOST
 * - WIND_PG_PORT
 * - WIND_PG_DATABASE
 * - WIND_PG_USER
 * - WIND_PG_PASSWORD
 */
@Module({
  imports: [ConfigModule, CacheModule],
  controllers: [WindETLController],
  providers: [WindETLDataSource, WindETLService],
  exports: [WindETLService],
})
export class WindETLModule {}
