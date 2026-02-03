import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  ValidateNested,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class RuleConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsIn(['lt', 'gt'])
  operator?: 'lt' | 'gt';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsIn(['llm_response', 'user_input'])
  matchField?: 'llm_response' | 'user_input';

  @IsOptional()
  @IsNumber()
  @Min(0)
  minRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRatio?: number;
}

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsIn(['token_threshold', 'keyword_match', 'token_ratio'])
  type: 'token_threshold' | 'keyword_match' | 'token_ratio';

  @ValidateNested()
  @Type(() => RuleConfigDto)
  config: RuleConfigDto;
}
