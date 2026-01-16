import { Module } from '@nestjs/common';
import { AnomalyService } from './anomaly.service';
import { AnomalyController } from './anomaly.controller';
import { MetricsModule } from '../../metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  providers: [AnomalyService],
  controllers: [AnomalyController],
  exports: [AnomalyService],
})
export class AnomalyModule {}
