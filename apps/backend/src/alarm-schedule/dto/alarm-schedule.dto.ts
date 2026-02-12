import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator';

export interface AlarmScheduleResponse {
  id: number;
  module: string;
  name: string;
  description: string | null;
  cronExpression: string;
  timezone: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  nextExecution: string | null;
  isRunning: boolean;
}

export class UpdateAlarmScheduleDto {
  @ApiPropertyOptional({ description: 'Cron 표현식' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9,\-\/\*]+\s+[0-9,\-\/\*]+\s+[0-9,\-\/\*]+\s+[0-9,\-\/\*]+\s+[0-9,\-\/\*]+$/, {
    message: '유효한 cron 표현식을 입력하세요 (예: */10 * * * *)',
  })
  cronExpression?: string;

  @ApiPropertyOptional({ description: '타임존' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: '표시 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}
