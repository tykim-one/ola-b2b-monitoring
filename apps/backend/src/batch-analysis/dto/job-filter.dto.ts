import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for filtering batch analysis jobs
 */
export class JobFilterDto {
  @ApiPropertyOptional({
    description: '작업 상태 필터',
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'])
  status?: string;

  @ApiPropertyOptional({
    description: '테넌트 ID 필터',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: '시작 날짜 (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '종료 날짜 (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '조회 개수',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: '오프셋',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * DTO for filtering analysis results
 */
export class ResultFilterDto {
  @ApiPropertyOptional({
    description: '작업 ID 필터',
  })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional({
    description: '테넌트 ID 필터',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: '결과 상태 필터',
    enum: ['SUCCESS', 'FAILED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['SUCCESS', 'FAILED'])
  status?: string;

  @ApiPropertyOptional({
    description: '최소 평균 점수 필터',
  })
  @IsOptional()
  @Type(() => Number)
  minAvgScore?: number;

  @ApiPropertyOptional({
    description: '최대 평균 점수 필터',
  })
  @IsOptional()
  @Type(() => Number)
  maxAvgScore?: number;

  @ApiPropertyOptional({
    description: '감정 필터',
    enum: ['positive', 'neutral', 'negative'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['positive', 'neutral', 'negative'])
  sentiment?: string;

  @ApiPropertyOptional({
    description: '이슈 보유 여부 필터 (true: 이슈 있음)',
  })
  @IsOptional()
  @Type(() => Boolean)
  hasIssues?: boolean;

  @ApiPropertyOptional({
    description: '조회 개수',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: '오프셋',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
