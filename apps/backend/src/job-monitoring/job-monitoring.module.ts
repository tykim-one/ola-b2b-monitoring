import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JobMonitoringController } from './job-monitoring.controller';
import { JobMonitoringService } from './job-monitoring.service';
import { JobMonitoringDataSource } from './job-monitoring.datasource';
import { CacheModule } from '../cache/cache.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Job 모니터링 모듈
 *
 * BigQuery (finola-global.ola_logging_monitoring.v_job_execution_logs) 기반 Job 실행 모니터링
 *
 * API 엔드포인트:
 * - GET /api/job-monitoring/health         - 헬스 체크
 * - GET /api/job-monitoring/logs           - 로그 목록 조회
 * - GET /api/job-monitoring/config-summary - config별 집계
 * - GET /api/job-monitoring/summary        - 전체 KPI 요약
 *
 * 환경변수:
 * - JOB_LOGS_BQ_PROJECT (default: finola-global)
 * - JOB_LOGS_BQ_DATASET (default: ola_logging_monitoring)
 * - JOB_LOGS_BQ_VIEW (default: v_job_execution_logs)
 */
@Module({
  imports: [ConfigModule, CacheModule, NotificationsModule],
  controllers: [JobMonitoringController],
  providers: [JobMonitoringDataSource, JobMonitoringService],
  exports: [JobMonitoringService],
})
export class JobMonitoringModule {}
