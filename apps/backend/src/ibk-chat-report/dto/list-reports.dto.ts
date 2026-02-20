import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListReportsDto {
  @ApiPropertyOptional({ description: '시작 날짜 (YYYY-MM-DD)', example: '2026-02-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜 (YYYY-MM-DD)', example: '2026-02-28' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '상태 필터',
    example: 'COMPLETED',
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '오프셋', default: 0, minimum: 0 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  offset?: number;
}
