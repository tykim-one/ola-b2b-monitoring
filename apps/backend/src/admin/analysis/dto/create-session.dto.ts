import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new analysis session
 */
export class CreateSessionDto {
  @ApiProperty({
    description: 'Session title',
    example: 'Weekly Usage Analysis',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description:
      'Optional context object for the session (e.g., filters, date ranges)',
    example: { projectId: 'my-project', dateRange: '7d' },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
