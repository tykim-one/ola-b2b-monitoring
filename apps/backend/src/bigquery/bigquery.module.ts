import { Module } from '@nestjs/common';
import { BigQueryController } from './bigquery.controller';
import { BigQueryService } from './bigquery.service';

@Module({
  controllers: [BigQueryController],
  providers: [BigQueryService],
  exports: [BigQueryService],
})
export class BigQueryModule {}
