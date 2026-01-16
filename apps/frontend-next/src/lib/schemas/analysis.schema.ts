import { z } from 'zod';

/**
 * 분석 세션 생성 스키마
 */
export const createSessionSchema = z.object({
  title: z
    .string()
    .min(1, '세션 제목을 입력하세요')
    .max(100, '제목은 100자 이하여야 합니다')
    .optional(),
});

/**
 * 메시지 전송 스키마
 */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, '메시지를 입력하세요')
    .max(4000, '메시지는 4000자 이하여야 합니다'),
  includeMetrics: z.boolean().optional(),
});

// Type exports
export type CreateSessionFormData = z.infer<typeof createSessionSchema>;
export type SendMessageFormData = z.infer<typeof sendMessageSchema>;
