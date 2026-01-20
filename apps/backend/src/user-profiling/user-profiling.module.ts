import { Module } from '@nestjs/common';
import { UserProfilingController } from './user-profiling.controller';
import { UserProfilingService } from './user-profiling.service';
import { CategoryClassifierService } from './category-classifier.service';
import { ProfileGeneratorService } from './profile-generator.service';
import { DatabaseModule } from '../admin/database/database.module';
import { QualityModule } from '../quality/quality.module';
import { CacheModule } from '../cache/cache.module';
import { LLMModule } from '../admin/analysis/llm/llm.module';

@Module({
  imports: [DatabaseModule, QualityModule, CacheModule, LLMModule],
  controllers: [UserProfilingController],
  providers: [
    UserProfilingService,
    CategoryClassifierService,
    ProfileGeneratorService,
  ],
  exports: [UserProfilingService],
})
export class UserProfilingModule {}
