import { z } from 'zod';

/**
 * 필터 조건 스키마
 */
export const filterCriteriaSchema = z.object({
  dateRange: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  tenantIds: z.array(z.string()).optional(),
  severities: z.array(z.string()).optional(),
  minTokens: z.number().nonnegative().optional(),
  maxTokens: z.number().nonnegative().optional(),
  searchQuery: z.string().optional(),
});

/**
 * 필터 생성/수정 스키마
 */
export const filterSchema = z.object({
  name: z
    .string()
    .min(2, '필터 이름은 2자 이상이어야 합니다')
    .max(50, '필터 이름은 50자 이하여야 합니다'),
  description: z
    .string()
    .max(200, '설명은 200자 이하여야 합니다')
    .optional()
    .or(z.literal('')),
  criteria: filterCriteriaSchema,
  isDefault: z.boolean().optional(),
});

// Type exports
export type FilterCriteriaFormData = z.infer<typeof filterCriteriaSchema>;
export type FilterFormData = z.infer<typeof filterSchema>;
