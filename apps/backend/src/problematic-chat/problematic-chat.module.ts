import { Module } from '@nestjs/common';
import { ProblematicChatController } from './problematic-chat.controller';
import { ProblematicChatService } from './problematic-chat.service';
import { AdminModule } from '../admin/admin.module';
import { CacheModule } from '../cache/cache.module';
import { DataSourceModule } from '../datasource/datasource.module';

@Module({
  imports: [
    AdminModule,      // PrismaService
    CacheModule,      // CacheService
    DataSourceModule, // MetricsDataSource
  ],
  controllers: [ProblematicChatController],
  providers: [ProblematicChatService],
  exports: [ProblematicChatService],
})
export class ProblematicChatModule {}
