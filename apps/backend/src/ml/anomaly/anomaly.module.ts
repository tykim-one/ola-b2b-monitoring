import { Module } from '@nestjs/common';
import { AnomalyService } from './anomaly.service';
import { AnomalyController } from './anomaly.controller';
import { BigQueryModule } from '../../bigquery/bigquery.module';

@Module({
  imports: [BigQueryModule],
  providers: [AnomalyService],
  controllers: [AnomalyController],
  exports: [AnomalyService],
})
export class AnomalyModule {}
