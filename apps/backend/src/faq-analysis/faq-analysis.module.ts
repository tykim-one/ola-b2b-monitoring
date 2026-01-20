import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FAQAnalysisController } from './faq-analysis.controller';
import { FAQAnalysisService } from './faq-analysis.service';
import { FAQClusteringService } from './services/faq-clustering.service';
import { ReasonAnalysisService } from './services/reason-analysis.service';
import { LLMModule } from '../admin/analysis/llm/llm.module';
import { DatabaseModule } from '../admin/database/database.module';

/**
 * FAQ Analysis Module
 *
 * FAQ 분석 기능을 제공하는 모듈
 * - 자주 묻는 질문 클러스터링
 * - LLM 기반 사유 분석
 * - Job 기반 분석 결과 저장
 */
@Module({
  imports: [ConfigModule, LLMModule, DatabaseModule],
  controllers: [FAQAnalysisController],
  providers: [FAQAnalysisService, FAQClusteringService, ReasonAnalysisService],
  exports: [FAQAnalysisService],
})
export class FAQAnalysisModule {}
