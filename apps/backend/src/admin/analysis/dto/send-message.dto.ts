import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

/**
 * DTO for sending a message in an analysis session
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Message content (user query or instruction)',
    example: 'What are the top 5 tenants by usage this week?',
    maxLength: 5000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    description: 'Whether to include current metrics context in the LLM prompt',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeMetrics?: boolean;
}
