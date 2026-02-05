import { Module } from '@nestjs/common';
import { ServiceHealthController } from './service-health.controller';
import { ServiceHealthService } from './service-health.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [ServiceHealthController],
  providers: [ServiceHealthService],
  exports: [ServiceHealthService],
})
export class ServiceHealthModule {}
