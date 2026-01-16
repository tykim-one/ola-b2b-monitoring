import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { DefaultProjectStrategy } from '../common/strategies/default.project.strategy';
import { DataSourceModule } from '../datasource';

@Module({
  imports: [DataSourceModule],
  controllers: [MetricsController],
  providers: [MetricsService, DefaultProjectStrategy],
  exports: [MetricsService],
})
export class MetricsModule {}
