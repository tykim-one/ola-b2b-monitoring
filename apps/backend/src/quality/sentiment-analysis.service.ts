import { Injectable } from '@nestjs/common';

export interface SentimentScore {
  frustrationLevel: number; // 0-1
  urgencyLevel: number; // 0-1
  formalityLevel: number; // 0-1 (1 = formal)
  isComplaint: boolean;
  detectedKeywords: string[];
  emotionalPatterns: string[];
}

export interface ConversationMessage {
  content: string;
  timestamp: string;
  isUser: boolean;
}

export interface ConversationSentimentAnalysis {
  overallFrustration: number;
  frustrationTrend: 'increasing' | 'decreasing' | 'stable';
  peakFrustrationIndex: number;
  alertRequired: boolean;
}

export interface FrustrationDetectionResult {
  userId: string;
  isFrustrated: boolean;
  frustrationScore: number;
  triggerReasons: string[];
  recommendedAction: 'monitor' | 'alert' | 'escalate';
}

export interface SentimentAnalysisConfig {
  frustrationThreshold?: number;
  urgencyThreshold?: number;
  alertThreshold?: number;
  escalationThreshold?: number;
  repetitionWindowSize?: number;
  repetitionSimilarityThreshold?: number;
}

@Injectable()
export class SentimentAnalysisService {
  private readonly config: Required<SentimentAnalysisConfig>;

  private readonly negativeKeywords = {
    korean: [
      '왜',
      '도대체',
      '짜증',
      '화나',
      '답답',
      '이상해',
      '바보',
      '멍청',
      '안돼',
      '못해',
      '실망',
      '최악',
      '쓰레기',
      '환불',
      '고소',
      '신고',
      '엉망',
      '형편없',
      '개같',
      '병신',
      '미친',
      '빡쳐',
      '열받',
    ],
    english: [
      'stupid',
      'useless',
      'terrible',
      'worst',
      'angry',
      'frustrated',
      'refund',
      'pathetic',
      'awful',
      'horrible',
      'ridiculous',
      'nonsense',
      'broken',
      'buggy',
      'crap',
      'garbage',
      'trash',
    ],
  };

  private readonly urgencyKeywords = {
    korean: ['급해', '빨리', '당장', '지금', '즉시', '서둘러'],
    english: [
      'urgent',
      'asap',
      'immediately',
      'quickly',
      'hurry',
      'now',
      'right now',
    ],
  };

  private readonly formalKeywords = {
    korean: [
      '합니다',
      '습니다',
      '하십시오',
      '께서',
      '드립니다',
      '주시',
      '시기',
      '하시',
    ],
    english: [
      'please',
      'kindly',
      'would',
      'could',
      'sir',
      'madam',
      'thank you',
    ],
  };

  private readonly complaintKeywords = {
    korean: ['환불', '고소', '신고', '불만', '항의', '문제', '이슈'],
    english: [
      'refund',
      'complaint',
      'report',
      'sue',
      'legal',
      'issue',
      'problem',
    ],
  };

  constructor() {
    this.config = {
      frustrationThreshold: 0.6,
      urgencyThreshold: 0.5,
      alertThreshold: 0.7,
      escalationThreshold: 0.85,
      repetitionWindowSize: 5,
      repetitionSimilarityThreshold: 0.7,
    };
  }

  /**
   * Analyze sentiment of a single text
   */
  analyzeSentiment(text: string): SentimentScore {
    const normalizedText = text.toLowerCase();
    const detectedKeywords: string[] = [];
    const emotionalPatterns: string[] = [];

    // Detect negative keywords
    let negativeCount = 0;
    [...this.negativeKeywords.korean, ...this.negativeKeywords.english].forEach(
      (keyword) => {
        if (normalizedText.includes(keyword.toLowerCase())) {
          detectedKeywords.push(keyword);
          negativeCount++;
        }
      },
    );

    // Detect emotional patterns
    const patterns = [
      { regex: /ㅋ{2,}/g, name: 'laughing' },
      { regex: /ㅎ{2,}/g, name: 'laughing_alt' },
      { regex: /ㅠ{2,}/g, name: 'crying' },
      { regex: /ㅡ{2,}/g, name: 'annoyed' },
      { regex: /;{2,}/g, name: 'awkward' },
      { regex: /!{3,}/g, name: 'multiple_exclamation' },
      { regex: /\?{3,}/g, name: 'multiple_question' },
      { regex: /\.{3,}/g, name: 'ellipsis' },
    ];

    patterns.forEach(({ regex, name }) => {
      const matches = text.match(regex);
      if (matches) {
        emotionalPatterns.push(`${name}(${matches.length})`);
      }
    });

    // Calculate frustration level
    const frustrationLevel = this.calculateFrustrationLevel(
      negativeCount,
      emotionalPatterns,
      text,
    );

    // Calculate urgency level
    const urgencyLevel = this.calculateUrgencyLevel(normalizedText, text);

    // Calculate formality level
    const formalityLevel = this.calculateFormalityLevel(normalizedText);

    // Detect if complaint
    const isComplaint = this.detectComplaint(normalizedText);

    return {
      frustrationLevel,
      urgencyLevel,
      formalityLevel,
      isComplaint,
      detectedKeywords,
      emotionalPatterns,
    };
  }

  /**
   * Analyze sentiment trend across a conversation
   */
  analyzeConversation(
    messages: ConversationMessage[],
  ): ConversationSentimentAnalysis {
    const userMessages = messages.filter((m) => m.isUser);

    if (userMessages.length === 0) {
      return {
        overallFrustration: 0,
        frustrationTrend: 'stable',
        peakFrustrationIndex: -1,
        alertRequired: false,
      };
    }

    // Analyze each message
    const sentiments = userMessages.map((msg) =>
      this.analyzeSentiment(msg.content),
    );
    const frustrationLevels = sentiments.map((s) => s.frustrationLevel);

    // Calculate overall frustration (weighted toward recent messages)
    const overallFrustration = this.calculateWeightedAverage(frustrationLevels);

    // Detect trend
    const frustrationTrend = this.detectTrend(frustrationLevels);

    // Find peak frustration
    const peakFrustrationIndex = frustrationLevels.indexOf(
      Math.max(...frustrationLevels),
    );

    // Check if alert required
    const alertRequired = overallFrustration >= this.config.alertThreshold;

    return {
      overallFrustration,
      frustrationTrend,
      peakFrustrationIndex,
      alertRequired,
    };
  }

  /**
   * Detect frustration for a specific user based on recent messages
   */
  detectFrustration(
    userId: string,
    recentMessages: string[],
  ): FrustrationDetectionResult {
    if (recentMessages.length === 0) {
      return {
        userId,
        isFrustrated: false,
        frustrationScore: 0,
        triggerReasons: [],
        recommendedAction: 'monitor',
      };
    }

    const triggerReasons: string[] = [];

    // Analyze each message
    const sentiments = recentMessages.map((msg) => this.analyzeSentiment(msg));
    const avgFrustration =
      sentiments.reduce((sum, s) => sum + s.frustrationLevel, 0) /
      sentiments.length;

    // Check for repeated similar questions
    const hasRepetition = this.detectRepetition(recentMessages);
    if (hasRepetition) {
      triggerReasons.push('Repeated similar questions detected');
    }

    // Check for increasing frustration
    const frustrationLevels = sentiments.map((s) => s.frustrationLevel);
    const trend = this.detectTrend(frustrationLevels);
    if (trend === 'increasing') {
      triggerReasons.push('Frustration level is increasing');
    }

    // Check for high urgency
    const avgUrgency =
      sentiments.reduce((sum, s) => sum + s.urgencyLevel, 0) /
      sentiments.length;
    if (avgUrgency >= this.config.urgencyThreshold) {
      triggerReasons.push('High urgency detected');
    }

    // Check for complaints
    const hasComplaint = sentiments.some((s) => s.isComplaint);
    if (hasComplaint) {
      triggerReasons.push('Complaint keywords detected');
    }

    // Calculate final frustration score
    let frustrationScore = avgFrustration;
    if (hasRepetition) frustrationScore += 0.15;
    if (trend === 'increasing') frustrationScore += 0.1;
    frustrationScore = Math.min(1, frustrationScore);

    // Determine recommended action
    let recommendedAction: 'monitor' | 'alert' | 'escalate';
    if (frustrationScore >= this.config.escalationThreshold) {
      recommendedAction = 'escalate';
      triggerReasons.push('Critical frustration level reached');
    } else if (frustrationScore >= this.config.alertThreshold) {
      recommendedAction = 'alert';
    } else if (frustrationScore >= this.config.frustrationThreshold) {
      recommendedAction = 'monitor';
    } else {
      recommendedAction = 'monitor';
    }

    return {
      userId,
      isFrustrated: frustrationScore >= this.config.frustrationThreshold,
      frustrationScore,
      triggerReasons,
      recommendedAction,
    };
  }

  /**
   * Determine if an alert should be triggered
   */
  shouldTriggerAlert(score: SentimentScore): boolean {
    return (
      score.frustrationLevel >= this.config.alertThreshold ||
      (score.frustrationLevel >= this.config.frustrationThreshold &&
        score.isComplaint)
    );
  }

  // Private helper methods

  private calculateFrustrationLevel(
    negativeCount: number,
    emotionalPatterns: string[],
    text: string,
  ): number {
    let score = 0;

    // Negative keywords contribution (0-0.6)
    score += Math.min(0.6, negativeCount * 0.15);

    // Emotional patterns contribution (0-0.3)
    const negativePatterns = emotionalPatterns.filter(
      (p) =>
        p.includes('crying') ||
        p.includes('annoyed') ||
        p.includes('multiple_exclamation') ||
        p.includes('multiple_question'),
    );
    score += Math.min(0.3, negativePatterns.length * 0.1);

    // Text length and caps contribution (0-0.1)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 10) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private calculateUrgencyLevel(
    normalizedText: string,
    originalText: string,
  ): number {
    let score = 0;

    // Urgency keywords (0-0.5)
    let urgencyKeywordCount = 0;
    [...this.urgencyKeywords.korean, ...this.urgencyKeywords.english].forEach(
      (keyword) => {
        if (normalizedText.includes(keyword.toLowerCase())) {
          urgencyKeywordCount++;
        }
      },
    );
    score += Math.min(0.5, urgencyKeywordCount * 0.2);

    // Multiple exclamation marks (0-0.3)
    const exclamationCount = (originalText.match(/!{2,}/g) || []).length;
    score += Math.min(0.3, exclamationCount * 0.15);

    // Multiple question marks (0-0.2)
    const questionCount = (originalText.match(/\?{2,}/g) || []).length;
    score += Math.min(0.2, questionCount * 0.1);

    return Math.min(1, score);
  }

  private calculateFormalityLevel(normalizedText: string): number {
    let formalCount = 0;
    let informalCount = 0;

    // Count formal keywords
    [...this.formalKeywords.korean, ...this.formalKeywords.english].forEach(
      (keyword) => {
        if (normalizedText.includes(keyword.toLowerCase())) {
          formalCount++;
        }
      },
    );

    // Count informal patterns
    const informalPatterns = [/ㅋ{2,}/g, /ㅎ{2,}/g, /ㅠ{2,}/g, /ㅡ{2,}/g];
    informalPatterns.forEach((pattern) => {
      const matches = normalizedText.match(pattern);
      if (matches) informalCount += matches.length;
    });

    // Calculate formality (0 = informal, 1 = formal)
    if (formalCount + informalCount === 0) return 0.5; // neutral
    return formalCount / (formalCount + informalCount);
  }

  private detectComplaint(normalizedText: string): boolean {
    return [
      ...this.complaintKeywords.korean,
      ...this.complaintKeywords.english,
    ].some((keyword) => normalizedText.includes(keyword.toLowerCase()));
  }

  private calculateWeightedAverage(values: number[]): number {
    if (values.length === 0) return 0;

    // More weight to recent messages
    let weightedSum = 0;
    let weightSum = 0;

    values.forEach((value, index) => {
      const weight = Math.pow(1.2, index); // Exponential weight
      weightedSum += value * weight;
      weightSum += weight;
    });

    return weightedSum / weightSum;
  }

  private detectTrend(
    values: number[],
  ): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 3) return 'stable';

    // Compare first half vs second half
    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);

    const firstAvg =
      firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    if (diff > 0.15) return 'increasing';
    if (diff < -0.15) return 'decreasing';
    return 'stable';
  }

  private detectRepetition(messages: string[]): boolean {
    if (messages.length < 2) return false;

    const recentWindow = messages.slice(-this.config.repetitionWindowSize);

    for (let i = 0; i < recentWindow.length - 1; i++) {
      for (let j = i + 1; j < recentWindow.length; j++) {
        const similarity = this.calculateSimilarity(
          recentWindow[i],
          recentWindow[j],
        );
        if (similarity >= this.config.repetitionSimilarityThreshold) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity using word tokens
    const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }
}
