import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for querying issue frequency
 */
export class IssueFrequencyQueryDto {
  @ApiPropertyOptional({
    description: '특정 작업 ID로 필터링',
  })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional({
    description: '테넌트 ID로 필터링',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: '반환할 이슈 개수 (기본: 10)',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

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
}

/**
 * 샘플 결과 정보
 */
export interface IssueSampleResult {
  id: string;
  userInput: string;
  tenantId: string;
  avgScore: number | null;
}

/**
 * 이슈 빈도 결과
 */
export interface IssueFrequencyResult {
  issue: string;
  count: number;
  percentage: number;
  sampleResults: IssueSampleResult[];
}

/**
 * 이슈 빈도 응답
 */
export interface IssueFrequencyResponse {
  issues: IssueFrequencyResult[];
  totalIssues: number;
  totalResults: number;
  filters: {
    jobId?: string;
    tenantId?: string;
    startDate?: string;
    endDate?: string;
  };
}
