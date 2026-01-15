import { Module } from '@nestjs/common';
import { AnomalyModule } from './anomaly/anomaly.module';

@Module({
  imports: [AnomalyModule],
  exports: [AnomalyModule],
})
export class MlModule {}
