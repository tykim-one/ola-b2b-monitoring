import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUserProfileDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  days?: number = 30;
}

export class GetSentimentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  days?: number = 30;
}

export class GetCategoriesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  days?: number = 30;
}

export class CreateProfilingJobDto {
  @IsString()
  targetDate: string; // ISO date string (YYYY-MM-DD)

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class GetJobsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
