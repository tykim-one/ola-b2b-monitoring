import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * Request DTO for chatbot chat endpoint
 */
export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  pageContext: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
