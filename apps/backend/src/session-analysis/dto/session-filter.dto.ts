import { IsOptional, IsInt, Min, Max, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Transform string 'true'/'false' to boolean
 */
const ToBoolean = () =>
  Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  });

/**
 * DTO for session list/stats filtering
 */
export class SessionFilterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  days?: number = 7;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @ToBoolean()
  isResolved?: boolean;

  @IsOptional()
  @ToBoolean()
  hasFrustration?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

/**
 * DTO for creating session analysis job
 */
export class CreateSessionAnalysisJobDto {
  @IsString()
  targetDate: string; // 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  maxSessions?: number = 100;
}

/**
 * DTO for session analysis results filtering
 */
export class SessionResultFilterDto {
  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isResolved?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
