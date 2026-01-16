import { z } from 'zod';

/**
 * 역할 생성/수정 스키마
 */
export const roleSchema = z.object({
  name: z
    .string()
    .min(2, '역할 이름은 2자 이상이어야 합니다')
    .max(50, '역할 이름은 50자 이하여야 합니다')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      '역할 이름은 영문, 숫자, 밑줄, 하이픈만 사용할 수 있습니다'
    ),
  description: z
    .string()
    .max(200, '설명은 200자 이하여야 합니다')
    .optional()
    .or(z.literal('')),
  permissionIds: z.array(z.string()).optional(),
});

// Type exports
export type RoleFormData = z.infer<typeof roleSchema>;
