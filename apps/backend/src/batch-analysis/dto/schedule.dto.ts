import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @IsInt()
  @Min(0)
  @Max(59)
  minute: number;

  @IsString()
  daysOfWeek: string; // "1,2,3,4,5" for weekdays

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  targetTenantId?: string;

  @IsInt()
  @Min(10)
  @Max(500)
  @IsOptional()
  sampleSize?: number;

  @IsString()
  @IsOptional()
  promptTemplateId?: string;
}

export class UpdateScheduleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  hour?: number;

  @IsInt()
  @Min(0)
  @Max(59)
  @IsOptional()
  minute?: number;

  @IsString()
  @IsOptional()
  daysOfWeek?: string;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  targetTenantId?: string;

  @IsInt()
  @Min(10)
  @Max(500)
  @IsOptional()
  sampleSize?: number;

  @IsString()
  @IsOptional()
  promptTemplateId?: string;
}
