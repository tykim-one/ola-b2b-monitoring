import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a batch analysis job
 */
export class CreateJobDto {
  @ApiProperty({
    description: '분석 대상 날짜 (YYYY-MM-DD)',
    example: '2025-01-16',
  })
  @IsDateString()
  targetDate: string;

  @ApiPropertyOptional({
    description: '특정 테넌트 ID (없으면 전체 테넌트)',
    example: 'tenant-001',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: '테넌트당 샘플 크기',
    default: 100,
    minimum: 10,
    maximum: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(500)
  sampleSize?: number;

  @ApiPropertyOptional({
    description: '프롬프트 템플릿 ID (없으면 기본 템플릿 사용)',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsString()
  promptTemplateId?: string;
}
