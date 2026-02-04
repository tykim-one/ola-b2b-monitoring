import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../admin/analysis/llm/llm.service';
import {
  QuestionCategory,
  CategoryClassificationResult,
  UserMessage,
  Sentiment,
} from './interfaces/user-profiling.interface';
import * as crypto from 'crypto';

/**
 * LLM 기반 질문 카테고리 분류 서비스
 */
@Injectable()
export class CategoryClassifierService {
  private readonly logger = new Logger(CategoryClassifierService.name);

  // 공격적 표현 키워드
  private readonly aggressiveKeywords = [
    '바보',
    '멍청',
    '쓰레기',
    '개같',
    '병신',
    '미친',
    'stupid',
    'idiot',
    'useless',
    'garbage',
    'trash',
    'crap',
  ];

  // 부정 감정 키워드
  private readonly negativeKeywords = [
    '왜',
    '도대체',
    '짜증',
    '화나',
    '답답',
    '실망',
    '최악',
    '환불',
    '고소',
    'angry',
    'frustrated',
    'terrible',
    'worst',
    'refund',
  ];

  constructor(private readonly llmService: LLMService) {}

  /**
   * 메시지 해시 생성 (중복 방지용)
   */
  generateMessageHash(userInput: string): string {
    return crypto.createHash('md5').update(userInput).digest('hex');
  }

  /**
   * 단일 메시지 카테고리 분류 (키워드 기반 빠른 분류)
   */
  classifyMessageQuick(userInput: string): CategoryClassificationResult {
    const normalizedText = userInput.toLowerCase();

    // 카테고리 키워드 매핑
    const categoryKeywords: Record<QuestionCategory, string[]> = {
      [QuestionCategory.COMPLAINT]: [
        '환불',
        '불만',
        '항의',
        '고소',
        '신고',
        'refund',
        'complaint',
        'sue',
      ],
      [QuestionCategory.PRICING]: [
        '가격',
        '비용',
        '요금',
        '할인',
        '무료',
        'price',
        'cost',
        'fee',
        'discount',
      ],
      [QuestionCategory.TECHNICAL_SUPPORT]: [
        '오류',
        '에러',
        '버그',
        '안됨',
        '작동',
        'error',
        'bug',
        'broken',
        'not working',
      ],
      [QuestionCategory.ACCOUNT]: [
        '로그인',
        '비밀번호',
        '계정',
        '인증',
        'login',
        'password',
        'account',
        'auth',
      ],
      [QuestionCategory.FEATURE_REQUEST]: [
        '기능',
        '추가',
        '개선',
        '요청',
        'feature',
        'add',
        'improve',
        'request',
      ],
      [QuestionCategory.PRODUCT_INQUIRY]: [
        '상품',
        '제품',
        '서비스',
        '어떻게',
        '뭐',
        'product',
        'service',
        'how',
        'what',
      ],
      [QuestionCategory.GENERAL_QUESTION]: [
        '질문',
        '궁금',
        '알려',
        'question',
        'wonder',
        'tell me',
      ],
      [QuestionCategory.OTHER]: [],
    };

    // 카테고리 매칭
    let matchedCategory = QuestionCategory.OTHER;
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter((kw) =>
        normalizedText.includes(kw.toLowerCase()),
      ).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        matchedCategory = category as QuestionCategory;
      }
    }

    // 감정 분석
    const sentiment = this.analyzeSentimentQuick(normalizedText);
    const isAggressive = this.detectAggressive(normalizedText);

    return {
      category: matchedCategory,
      confidence: maxMatches > 0 ? Math.min(0.9, 0.5 + maxMatches * 0.2) : 0.5,
      sentiment,
      isAggressive,
    };
  }

  /**
   * LLM 기반 정밀 카테고리 분류 (배치용)
   */
  async classifyMessagesWithLLM(
    messages: UserMessage[],
  ): Promise<CategoryClassificationResult[]> {
    if (messages.length === 0) {
      return [];
    }

    const results: CategoryClassificationResult[] = [];

    // 배치로 처리 (최대 10개씩)
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      try {
        const batchResults = await this.classifyBatch(batch);
        results.push(...batchResults);
      } catch (error) {
        this.logger.error(`Batch classification failed: ${error.message}`);
        // 실패 시 키워드 기반 빠른 분류로 폴백
        const fallbackResults = batch.map((msg) =>
          this.classifyMessageQuick(msg.userInput),
        );
        results.push(...fallbackResults);
      }
    }

    return results;
  }

  /**
   * 배치 분류 (LLM 호출)
   */
  private async classifyBatch(
    messages: UserMessage[],
  ): Promise<CategoryClassificationResult[]> {
    const categories = Object.values(QuestionCategory);
    const categoryDescriptions = categories
      .map((c) => `- ${c}: ${this.getCategoryDescription(c)}`)
      .join('\n');

    const messagesText = messages
      .map((m, idx) => `[${idx + 1}] "${m.userInput}"`)
      .join('\n');

    const prompt = `다음 사용자 질문들을 분석하여 카테고리, 감정, 공격성 여부를 JSON 형식으로 반환해주세요.

## 카테고리 목록
${categoryDescriptions}

## 분석할 질문들
${messagesText}

## 응답 형식 (JSON 배열)
[
  {
    "index": 1,
    "category": "카테고리명",
    "sentiment": "positive" | "neutral" | "negative",
    "isAggressive": true | false,
    "confidence": 0.0-1.0
  },
  ...
]

JSON만 반환하세요. 다른 설명은 필요 없습니다.`;

    const response = await this.llmService.generateAnalysis([
      { role: 'user', content: prompt },
    ]);

    // JSON 파싱
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid LLM response format');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      index: number;
      category: string;
      sentiment: string;
      isAggressive: boolean;
      confidence: number;
    }>;

    return parsed.map((item) => ({
      category: this.mapToCategory(item.category),
      sentiment: (item.sentiment || 'neutral') as Sentiment,
      isAggressive: item.isAggressive || false,
      confidence: item.confidence || 0.7,
    }));
  }

  /**
   * 카테고리 문자열을 enum으로 매핑
   */
  private mapToCategory(categoryStr: string): QuestionCategory {
    const normalized = categoryStr.toLowerCase().replace(/[^a-z_]/g, '');

    // 직접 매핑
    if (
      Object.values(QuestionCategory).includes(normalized as QuestionCategory)
    ) {
      return normalized as QuestionCategory;
    }

    // 유사 매핑
    const mappings: Record<string, QuestionCategory> = {
      product: QuestionCategory.PRODUCT_INQUIRY,
      inquiry: QuestionCategory.PRODUCT_INQUIRY,
      complaint: QuestionCategory.COMPLAINT,
      angry: QuestionCategory.COMPLAINT,
      technical: QuestionCategory.TECHNICAL_SUPPORT,
      support: QuestionCategory.TECHNICAL_SUPPORT,
      tech: QuestionCategory.TECHNICAL_SUPPORT,
      general: QuestionCategory.GENERAL_QUESTION,
      question: QuestionCategory.GENERAL_QUESTION,
      price: QuestionCategory.PRICING,
      cost: QuestionCategory.PRICING,
      account: QuestionCategory.ACCOUNT,
      login: QuestionCategory.ACCOUNT,
      feature: QuestionCategory.FEATURE_REQUEST,
      request: QuestionCategory.FEATURE_REQUEST,
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    return QuestionCategory.OTHER;
  }

  /**
   * 카테고리 설명 반환
   */
  private getCategoryDescription(category: QuestionCategory): string {
    const descriptions: Record<QuestionCategory, string> = {
      [QuestionCategory.PRODUCT_INQUIRY]: '상품/서비스에 대한 문의',
      [QuestionCategory.COMPLAINT]: '불만/항의/환불 요청',
      [QuestionCategory.TECHNICAL_SUPPORT]: '기술적 문제/오류/버그 관련',
      [QuestionCategory.GENERAL_QUESTION]: '일반적인 질문',
      [QuestionCategory.PRICING]: '가격/비용/요금 문의',
      [QuestionCategory.ACCOUNT]: '계정/로그인/인증 관련',
      [QuestionCategory.FEATURE_REQUEST]: '기능 요청/개선 제안',
      [QuestionCategory.OTHER]: '기타',
    };
    return descriptions[category];
  }

  /**
   * 빠른 감정 분석
   */
  private analyzeSentimentQuick(text: string): Sentiment {
    const negativeCount = this.negativeKeywords.filter((kw) =>
      text.includes(kw.toLowerCase()),
    ).length;

    const positiveKeywords = [
      '감사',
      '좋아',
      '훌륭',
      '최고',
      'thank',
      'great',
      'good',
      'excellent',
    ];
    const positiveCount = positiveKeywords.filter((kw) =>
      text.includes(kw.toLowerCase()),
    ).length;

    if (negativeCount > positiveCount && negativeCount > 0) {
      return 'negative';
    }
    if (positiveCount > negativeCount && positiveCount > 0) {
      return 'positive';
    }
    return 'neutral';
  }

  /**
   * 공격적 표현 감지
   */
  private detectAggressive(text: string): boolean {
    return this.aggressiveKeywords.some((kw) =>
      text.includes(kw.toLowerCase()),
    );
  }
}
