import {
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
  IsIn,
  IsArray,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RULE_FIELDS, RULE_OPERATORS } from '@ola/shared-types';
import type { ProblematicChatRuleConfig } from '@ola/shared-types';

/**
 * Custom validator for rule config.
 * Supports both simple (v1) and compound (v2) configs.
 */
function IsValidRuleConfig(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidRuleConfig',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'object') return false;

          // Compound config (v2)
          if ('version' in value && value.version === 2) {
            if (!value.logic || !['AND', 'OR'].includes(value.logic)) return false;
            if (!Array.isArray(value.conditions) || value.conditions.length === 0) return false;

            // Validate each condition
            for (const cond of value.conditions) {
              if (!cond.field || !cond.operator || cond.value === undefined) return false;

              // Validate field exists
              const fieldDef = RULE_FIELDS.find(f => f.field === cond.field);
              if (!fieldDef) return false;

              // Validate operator exists and is applicable to field
              const operatorDef = RULE_OPERATORS.find(op => op.operator === cond.operator);
              if (!operatorDef || !operatorDef.applicableTo.includes(fieldDef.dataType)) return false;

              // Validate value type matches operator expectation
              if (operatorDef.valueType === 'string_array' && !Array.isArray(cond.value)) return false;
              if (operatorDef.valueType === 'number' && typeof cond.value !== 'number') return false;
              if (operatorDef.valueType === 'string' && typeof cond.value !== 'string') return false;
              if (operatorDef.valueType === 'boolean' && typeof cond.value !== 'boolean') return false;
            }
            return true;
          }

          // Simple config (v1 - backward compatibility)
          if (!value.field || !value.operator || value.value === undefined) return false;

          const fieldDef = RULE_FIELDS.find(f => f.field === value.field);
          if (!fieldDef) return false;

          const operatorDef = RULE_OPERATORS.find(op => op.operator === value.operator);
          if (!operatorDef || !operatorDef.applicableTo.includes(fieldDef.dataType)) return false;

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Invalid rule config format or field/operator mismatch';
        },
      },
    });
  };
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

  @IsValidRuleConfig()
  config: ProblematicChatRuleConfig;
}
