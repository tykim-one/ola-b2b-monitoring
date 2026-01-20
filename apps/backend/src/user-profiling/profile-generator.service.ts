import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../admin/analysis/llm/llm.service';
import {
  UserMessage,
  ProfileGenerationResult,
  CategoryDistribution,
  CategoryLabels,
  QuestionCategory,
} from './interfaces/user-profiling.interface';

/**
 * LLM 기반 유저 프로필 요약 생성 서비스
 */
@Injectable()
export class ProfileGeneratorService {
  private readonly logger = new Logger(ProfileGeneratorService.name);

  constructor(private readonly llmService: LLMService) {}

  /**
   * 유저 프로필 요약 생성
   */
  async generateProfileSummary(
    userId: string,
    messages: UserMessage[],
    categoryDistribution: CategoryDistribution,
  ): Promise<ProfileGenerationResult> {
    if (messages.length === 0) {
      return {
        behaviorSummary: '분석할 대화 내역이 없습니다.',
        mainInterests: '정보 없음',
        painPoints: '정보 없음',
      };
    }

    // 최근 메시지 샘플 (최대 20개)
    const recentMessages = messages.slice(-20);

    // 카테고리 분포 텍스트 생성
    const categoryText = Object.entries(categoryDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, count]) => {
        const label = CategoryLabels[cat as QuestionCategory] || cat;
        return `- ${label}: ${count}건`;
      })
      .join('\n');

    // 대화 샘플 텍스트 생성
    const conversationSamples = recentMessages
      .map(
        (msg, idx) =>
          `[${idx + 1}] Q: "${this.truncate(msg.userInput, 100)}" / A: "${this.truncate(msg.llmResponse, 100)}"`,
      )
      .join('\n');

    const prompt = `다음 정보를 바탕으로 사용자 프로필을 분석해주세요.

## 사용자 정보
- 사용자 ID: ${userId}
- 총 대화 수: ${messages.length}건

## 질문 카테고리 분포
${categoryText || '카테고리 분포 없음'}

## 최근 대화 샘플 (Q: 질문, A: 응답)
${conversationSamples}

## 분석 요청
위 정보를 바탕으로 다음 JSON 형식으로 분석해주세요:

{
  "behaviorSummary": "사용자의 전반적인 행동 패턴과 특징을 2-3문장으로 요약",
  "mainInterests": "사용자의 주요 관심사를 불릿 포인트로 나열 (예: - 상품 가격 비교\\n- 배송 일정 확인)",
  "painPoints": "사용자가 경험한 주요 불만이나 문제점을 불릿 포인트로 나열 (예: - 응답 속도 불만\\n- 정보 정확성 의문)"
}

반드시 JSON 형식만 반환하세요. 다른 설명은 필요 없습니다.`;

    try {
      const response = await this.llmService.generateAnalysis([
        { role: 'user', content: prompt },
      ]);

      // JSON 파싱
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid LLM response format');
      }

      const parsed = JSON.parse(jsonMatch[0]) as ProfileGenerationResult;

      return {
        behaviorSummary: parsed.behaviorSummary || '분석 결과 없음',
        mainInterests: parsed.mainInterests || '정보 없음',
        painPoints: parsed.painPoints || '정보 없음',
      };
    } catch (error) {
      this.logger.error(`Profile generation failed: ${error.message}`);

      // 폴백: 키워드 기반 간단 요약
      return this.generateFallbackSummary(messages, categoryDistribution);
    }
  }

  /**
   * 폴백 요약 생성 (LLM 실패 시)
   */
  private generateFallbackSummary(
    messages: UserMessage[],
    categoryDistribution: CategoryDistribution,
  ): ProfileGenerationResult {
    // 상위 카테고리 추출
    const topCategories = Object.entries(categoryDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => CategoryLabels[cat as QuestionCategory] || cat);

    // 실패한 메시지 수
    const failedCount = messages.filter((m) => !m.success).length;
    const failRate = messages.length > 0 ? (failedCount / messages.length) * 100 : 0;

    const behaviorSummary =
      topCategories.length > 0
        ? `주로 ${topCategories.join(', ')} 관련 질문을 하는 사용자입니다. 총 ${messages.length}건의 대화를 진행했습니다.`
        : `총 ${messages.length}건의 대화를 진행한 사용자입니다.`;

    const mainInterests =
      topCategories.length > 0
        ? topCategories.map((c) => `- ${c}`).join('\n')
        : '- 정보 부족';

    const painPoints =
      failRate > 10
        ? `- 응답 실패율 ${failRate.toFixed(1)}%로 서비스 품질 개선 필요`
        : '- 특별한 불만 패턴 미감지';

    return {
      behaviorSummary,
      mainInterests,
      painPoints,
    };
  }

  /**
   * 텍스트 자르기
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
