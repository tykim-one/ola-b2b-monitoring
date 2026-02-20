import { IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateReportDto {
  @ApiProperty({
    description: '리포트 대상 날짜 (YYYY-MM-DD)',
    example: '2026-02-18',
  })
  @IsDateString()
  targetDate: string;

  @ApiPropertyOptional({
    description: '기존 리포트 덮어쓰기 여부',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
