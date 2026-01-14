import { Module } from '@nestjs/common';
import { BigQueryController } from './bigquery.controller';
import { BigQueryService } from './bigquery.service';
import { DefaultProjectStrategy } from '../common/strategies/default.project.strategy';

@Module({
  controllers: [BigQueryController],
  providers: [BigQueryService, DefaultProjectStrategy],
  exports: [BigQueryService],
})
export class BigQueryModule {}
