import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FAQCluster } from '../interfaces/faq-cluster.interface';

/**
 * FAQ 분석 요청 DTO
 */
export class FAQAnalysisRequestDto {
  @ApiPropertyOptional({
    description: '특정 테넌트 ID로 필터링',
    example: 'tenant-123',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({
    description: '분석 기간 (일)',
    enum: [7, 14, 30],
    default: 7,
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 14, 30])
  periodDays: number = 7;

  @ApiProperty({
    description: '반환할 FAQ 개수',
    enum: [10, 20, 50],
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 20, 50])
  topN: number = 10;
}

/**
 * FAQ 분석 응답 DTO
 */
export class FAQAnalysisResponseDto {
  @ApiProperty({
    description: '분석 완료 시간',
    example: '2024-01-15T14:30:00Z',
  })
  analyzedAt: string;

  @ApiProperty({
    description: '분석된 총 질문 수',
    example: 2345,
  })
  totalQuestions: number;

  @ApiProperty({
    description: '분석 기간',
  })
  period: {
    start: string;
    end: string;
    days: number;
  };

  @ApiProperty({
    description: 'FAQ 클러스터 목록',
    type: 'array',
  })
  clusters: FAQCluster[];

  @ApiProperty({
    description: '필터 정보',
  })
  filters: {
    tenantId?: string;
    topN: number;
  };

  @ApiProperty({
    description: 'LLM 병합 사용 여부 (실패 시 false)',
  })
  llmMergeApplied: boolean;
}

// ==================== Job 관련 DTO ====================

/**
 * FAQ Job 생성 요청 DTO
 */
export class CreateFAQJobDto {
  @ApiPropertyOptional({
    description: '특정 테넌트 ID로 필터링',
    example: 'tenant-123',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({
    description: '분석 기간 (일)',
    enum: [7, 14, 30],
    default: 7,
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 14, 30])
  periodDays: number = 7;

  @ApiProperty({
    description: '반환할 FAQ 개수',
    enum: [10, 20, 50],
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 20, 50])
  topN: number = 10;
}

/**
 * FAQ Job 응답 DTO
 */
export class FAQJobDto {
  @ApiProperty({ description: 'Job ID' })
  id: string;

  @ApiProperty({ description: 'Job 상태', enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] })
  status: string;

  @ApiPropertyOptional({ description: '테넌트 ID' })
  tenantId: string | null;

  @ApiProperty({ description: '분석 기간 (일)' })
  periodDays: number;

  @ApiProperty({ description: 'Top N 개수' })
  topN: number;

  @ApiPropertyOptional({ description: '분석된 총 질문 수' })
  totalQuestions: number | null;

  @ApiPropertyOptional({ description: '생성된 클러스터 수' })
  clusterCount: number | null;

  @ApiProperty({ description: 'LLM 병합 적용 여부' })
  llmMergeApplied: boolean;

  @ApiPropertyOptional({ description: '시작 시간' })
  startedAt: string | null;

  @ApiPropertyOptional({ description: '완료 시간' })
  completedAt: string | null;

  @ApiPropertyOptional({ description: '오류 메시지' })
  errorMessage: string | null;

  @ApiProperty({ description: '생성 시간' })
  createdAt: string;

  @ApiProperty({ description: '결과 개수' })
  resultCount: number;
}

/**
 * FAQ Job 결과 DTO (클러스터)
 */
export class FAQJobResultDto {
  @ApiProperty({ description: '결과 ID' })
  id: string;

  @ApiProperty({ description: 'Job ID' })
  jobId: string;

  @ApiProperty({ description: '순위' })
  rank: number;

  @ApiProperty({ description: '대표 질문' })
  representativeQuestion: string;

  @ApiProperty({ description: '빈도' })
  frequency: number;

  @ApiProperty({ description: '사유 분석' })
  reasonAnalysis: string;

  @ApiProperty({ description: 'LLM 병합 여부' })
  isMerged: boolean;

  @ApiProperty({ description: '포함된 질문 목록' })
  questions: { text: string; count: number; tenantId: string }[];

  @ApiProperty({ description: '생성 시간' })
  createdAt: string;
}
