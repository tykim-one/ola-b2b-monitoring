import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import type { FilterCriteria } from '@ola/shared-types';

export class CreateFilterDto {
  @ApiProperty({ example: 'My Dashboard Filter', description: 'Filter name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Shows data for tenant X from last 7 days',
    description: 'Filter description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: {
      tenantIds: ['tenant-1', 'tenant-2'],
      dateRange: { start: '2025-01-01', end: '2025-01-15' },
      severity: ['ERROR', 'WARN'],
    },
    description: 'Filter criteria object',
  })
  @IsObject()
  @IsNotEmpty()
  criteria: FilterCriteria;

  @ApiProperty({
    example: false,
    description: 'Set as default filter',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
