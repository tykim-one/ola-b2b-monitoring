import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ProblematicChatFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(90)
  days?: number = 7;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim());
    }
    return value;
  })
  ruleIds?: string[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class ProblematicChatStatsFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(90)
  days?: number = 7;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
