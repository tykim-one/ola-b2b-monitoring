import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a prompt template
 */
export class CreatePromptTemplateDto {
  @ApiProperty({
    description: '템플릿 이름 (고유)',
    example: '기본 품질 분석',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: '템플릿 설명',
    example: '대화 품질을 분석하고 개선점을 제안합니다.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: '프롬프트 템플릿 ({{user_input}}, {{llm_response}} 변수 지원)',
    example: '다음 대화를 분석하고 품질 점수(1-10)와 개선점을 JSON 형식으로 응답해주세요.\n\n사용자 질문: {{user_input}}\n\nLLM 응답: {{llm_response}}',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  prompt: string;

  @ApiPropertyOptional({
    description: '기본 템플릿 여부',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

/**
 * DTO for updating a prompt template
 */
export class UpdatePromptTemplateDto {
  @ApiPropertyOptional({
    description: '템플릿 이름',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: '템플릿 설명',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: '프롬프트 템플릿',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  prompt?: string;

  @ApiPropertyOptional({
    description: '기본 템플릿 여부',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: '활성화 여부',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
