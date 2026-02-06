import {
  IsString,
  IsOptional,
  IsBoolean,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { RULE_FIELDS, RULE_OPERATORS } from '@ola/shared-types';
import type { ProblematicChatRuleConfig } from '@ola/shared-types';

/**
 * Custom validator for rule config.
 * Supports both simple (v1) and compound (v2) configs.
 */
function IsValidRuleConfig(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidRuleConfig',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!value || typeof value !== 'object') return false;
          const v = value as Record<string, unknown>;

          // Compound config (v2)
          if ('version' in v && v.version === 2) {
            if (!v.logic || !['AND', 'OR'].includes(v.logic as string))
              return false;
            const conditions = v.conditions as
              | Record<string, unknown>[]
              | undefined;
            if (!Array.isArray(conditions) || conditions.length === 0)
              return false;

            // Validate each condition
            for (const cond of conditions) {
              if (!cond.field || !cond.operator || cond.value === undefined)
                return false;

              // Validate field exists
              const fieldDef = RULE_FIELDS.find((f) => f.field === cond.field);
              if (!fieldDef) return false;

              // Validate operator exists and is applicable to field
              const operatorDef = RULE_OPERATORS.find(
                (op) => op.operator === cond.operator,
              );
              if (
                !operatorDef ||
                !operatorDef.applicableTo.includes(fieldDef.dataType)
              )
                return false;

              // Validate value type matches operator expectation
              if (
                operatorDef.valueType === 'string_array' &&
                !Array.isArray(cond.value)
              )
                return false;
              if (
                operatorDef.valueType === 'number' &&
                typeof cond.value !== 'number'
              )
                return false;
              if (
                operatorDef.valueType === 'string' &&
                typeof cond.value !== 'string'
              )
                return false;
              if (
                operatorDef.valueType === 'boolean' &&
                typeof cond.value !== 'boolean'
              )
                return false;
            }
            return true;
          }

          // Simple config (v1 - backward compatibility)
          if (!v.field || !v.operator || v.value === undefined) return false;

          const fieldDef = RULE_FIELDS.find((f) => f.field === v.field);
          if (!fieldDef) return false;

          const operatorDef = RULE_OPERATORS.find(
            (op) => op.operator === v.operator,
          );
          if (
            !operatorDef ||
            !operatorDef.applicableTo.includes(fieldDef.dataType)
          )
            return false;

          return true;
        },
        defaultMessage() {
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
