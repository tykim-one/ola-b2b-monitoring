import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDto {
  @ApiProperty({
    description: 'Custom SQL query to execute on BigQuery',
    example: 'SELECT * FROM `dataset.table` LIMIT 10',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    default: 1000,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  maxResults?: number;
}
