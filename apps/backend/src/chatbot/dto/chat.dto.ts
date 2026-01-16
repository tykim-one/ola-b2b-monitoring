import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * Request DTO for chatbot chat endpoint
 */
export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  pageContext: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
