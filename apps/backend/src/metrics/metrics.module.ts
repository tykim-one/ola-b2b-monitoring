import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { DomainMetricsService } from './domain-metrics.service';
import { GlobalMetricsService } from './global-metrics.service';
import { AggregationController } from './aggregation.controller';
import { DefaultProjectStrategy } from '../common/strategies/default.project.strategy';
import { DataSourceModule } from '../datasource';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [DataSourceModule, CacheModule],
  controllers: [MetricsController, AggregationController],
  providers: [
    MetricsService,
    DomainMetricsService,
    GlobalMetricsService,
    DefaultProjectStrategy,
  ],
  exports: [MetricsService, DomainMetricsService, GlobalMetricsService],
})
export class MetricsModule {}
