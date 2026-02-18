import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../admin/analysis/llm/llm.service';
import {
  RawQuestion,
  NormalizedGroup,
  MergedCluster,
  LLMClusteringResponse,
} from '../interfaces/faq-cluster.interface';

/**
 * 키워드 사전: 핵심 토픽별 동의어 패턴
 */
const KEYWORD_PATTERNS: Record<string, string[]> = {
  배송: ['배송', '배달', '도착', '수령', '택배'],
  결제: ['결제', '지불', '카드', '계좌', '페이', '입금', '송금'],
  반품: ['반품', '환불', '반송', '돌려'],
  교환: ['교환', '바꾸', '변경'],
  취소: ['취소'],
  주문: ['주문', '구매', '구입', '장바구니'],
  로그인: ['로그인', '로그아웃', '비밀번호', '비번', '계정', '인증'],
  회원: ['회원', '가입', '탈퇴', '회원가입'],
  가격: ['가격', '금액', '비용', '할인', '쿠폰', '적립'],
  상품: ['상품', '제품', '품목', '물건'],
  재고: ['재고', '품절', '입고'],
  포인트: ['포인트', '적립금', '마일리지'],
  이벤트: ['이벤트', '프로모션', '행사'],
};

/**
 * 의도 패턴: 질문 의도별 정규식 패턴
 */
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  시간확인: [/언제/, /얼마나/, /며칠/, /시간/, /기간/],
  방법질문: [/어떻게/, /방법/, /하는\s?법/, /어디서/, /어디에/, /어디로/],
  상태확인: [/확인/, /조회/, /알려/, /보여/, /알고\s?싶/, /알\s?수/],
  가능여부: [/가능/, /되나요/, /할\s?수/, /안\s?되/, /못/, /없나요/],
  이유질문: [/왜/, /이유/, /원인/, /뭐\s?때문/],
  비용문의: [/얼마/, /비용/, /가격/, /무료/, /유료/],
  문제신고: [
    /안\s?됨/,
    /안\s?돼/,
    /오류/,
    /에러/,
    /문제/,
    /고장/,
    /안\s?나/,
    /안\s?되/,
  ],
  요청: [/해\s?주세요/, /부탁/, /원해요/, /싶어요/, /주세요/],
};

/**
 * FAQ Clustering Service
 *
 * 키워드+의도 기반 룰베이스 그룹화 및 LLM 기반 유사 그룹 병합을 담당
 */
@Injectable()
export class FAQClusteringService {
  private readonly logger = new Logger(FAQClusteringService.name);

  constructor(private readonly llmService: LLMService) {}

  /**
   * 텍스트 정규화
   * - 공백 통일
   * - 특수문자 제거
   * - 소문자 변환 (영문)
   * - 앞뒤 공백 제거
   */
  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // 연속 공백을 단일 공백으로
      .replace(/[?!.,;:'"()[\]{}]/g, '') // 특수문자 제거
      .trim();
  }

  /**
   * 키워드 추출 (첫 번째 매칭 키워드 반환)
   */
  extractKeyword(text: string): string | null {
    const lowerText = text.toLowerCase();
    for (const [keyword, patterns] of Object.entries(KEYWORD_PATTERNS)) {
      if (patterns.some((p) => lowerText.includes(p))) {
        return keyword;
      }
    }
    return null;
  }

  /**
   * 의도 패턴 추출 (첫 번째 매칭 의도 반환)
   */
  extractIntent(text: string): string | null {
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (patterns.some((p) => p.test(text))) {
        return intent;
      }
    }
    return null;
  }

  /**
   * 그룹화 키 생성
   * 키워드와 의도가 모두 있으면 조합, 없으면 정규화된 텍스트 사용
   */
  generateGroupKey(text: string): { key: string; isRuleBased: boolean } {
    const keyword = this.extractKeyword(text);
    const intent = this.extractIntent(text);

    if (keyword && intent) {
      return { key: `${keyword}:${intent}`, isRuleBased: true };
    }
    // fallback: 기존 정규화 방식
    return { key: this.normalizeText(text), isRuleBased: false };
  }

  /**
   * 1차 그룹화: 키워드+의도 기반 룰베이스 그룹화
   * 룰에 매칭되지 않으면 정규화된 텍스트 기준으로 그룹화 (fallback)
   */
  groupByNormalization(questions: RawQuestion[]): NormalizedGroup[] {
    const groupMap = new Map<
      string,
      {
        representativeQuestion: string;
        questions: { text: string; count: number; tenantId: string }[];
        totalFrequency: number;
        isRuleBased: boolean;
      }
    >();

    for (const q of questions) {
      const { key, isRuleBased } = this.generateGroupKey(q.userInput);

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          representativeQuestion: q.userInput, // 첫 번째 원본 텍스트를 대표로
          questions: [],
          totalFrequency: 0,
          isRuleBased,
        });
      }

      const group = groupMap.get(key)!;
      group.questions.push({
        text: q.userInput,
        count: q.count,
        tenantId: q.tenantId,
      });
      group.totalFrequency += q.count;

      // 빈도가 가장 높은 원본 텍스트를 대표 질문으로 설정
      const maxQuestion = group.questions.reduce((max, curr) =>
        curr.count > max.count ? curr : max,
      );
      group.representativeQuestion = maxQuestion.text;
    }

    // NormalizedGroup 배열로 변환 및 빈도순 정렬
    const groups: NormalizedGroup[] = Array.from(groupMap.entries()).map(
      ([key, data]) => ({
        id: crypto.randomUUID(),
        normalizedText: key,
        representativeQuestion: data.representativeQuestion,
        frequency: data.totalFrequency,
        questions: data.questions,
      }),
    );

    this.logger.log(
      `그룹화 완료: 총 ${groups.length}개 그룹 (룰베이스: ${
        Array.from(groupMap.values()).filter((g) => g.isRuleBased).length
      }개)`,
    );

    return groups.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 2차 그룹화: LLM을 사용하여 유사한 그룹 병합
   * 실패 시 1차 그룹 결과를 그대로 반환
   */
  async mergeWithLLM(
    groups: NormalizedGroup[],
    topN: number,
  ): Promise<{ clusters: MergedCluster[]; llmApplied: boolean }> {
    // Top N개만 선택
    const topGroups = groups.slice(0, Math.min(topN * 2, groups.length)); // LLM 병합 고려하여 2배로

    if (topGroups.length <= 3) {
      // 그룹이 너무 적으면 병합 불필요
      return {
        clusters: this.convertToMergedClusters(topGroups.slice(0, topN)),
        llmApplied: false,
      };
    }

    try {
      const prompt = this.buildClusteringPrompt(topGroups);

      const response = await this.llmService.generateAnalysis([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      const parsed = this.parseLLMResponse(response.content);

      if (!parsed) {
        this.logger.warn('LLM 클러스터링 응답 파싱 실패, 1차 그룹 사용');
        return {
          clusters: this.convertToMergedClusters(topGroups.slice(0, topN)),
          llmApplied: false,
        };
      }

      const mergedClusters = this.applyMerging(topGroups, parsed);
      return {
        clusters: mergedClusters.slice(0, topN),
        llmApplied: true,
      };
    } catch (error) {
      this.logger.error(`LLM 클러스터링 실패: ${error.message}`);
      return {
        clusters: this.convertToMergedClusters(topGroups.slice(0, topN)),
        llmApplied: false,
      };
    }
  }

  /**
   * LLM 클러스터링 프롬프트 생성
   */
  private buildClusteringPrompt(groups: NormalizedGroup[]): string {
    const groupList = groups
      .map(
        (g, idx) =>
          `${idx + 1}. [ID: ${g.id}] "${g.representativeQuestion}" (빈도: ${g.frequency})`,
      )
      .join('\n');

    return `다음은 사용자들이 자주 묻는 질문 그룹 목록입니다.
의미적으로 유사한 그룹들을 병합해주세요. 병합 기준은 같은 의도나 주제를 다루는 질문입니다.

질문 그룹:
${groupList}

응답은 반드시 아래 JSON 형식으로만 작성해주세요. 다른 설명은 포함하지 마세요:
{
  "mergedGroups": [
    {
      "representativeQuestion": "병합된 그룹의 대표 질문",
      "mergedIds": ["id1", "id2"],
      "reason": "병합 이유 (10자 이내)"
    }
  ],
  "unmergedIds": ["병합되지 않은 그룹의 ID들"]
}

주의사항:
- 의미가 명확히 다른 질문은 병합하지 마세요
- 모든 ID는 mergedGroups 또는 unmergedIds 중 하나에만 포함되어야 합니다
- mergedIds에는 최소 2개 이상의 ID가 있어야 합니다`;
  }

  /**
   * LLM 응답 파싱
   */
  private parseLLMResponse(content: string): LLMClusteringResponse | null {
    try {
      // JSON 블록 추출
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 필수 필드 검증
      if (!parsed.mergedGroups || !Array.isArray(parsed.mergedGroups)) {
        return null;
      }
      if (!parsed.unmergedIds || !Array.isArray(parsed.unmergedIds)) {
        parsed.unmergedIds = [];
      }

      return parsed as LLMClusteringResponse;
    } catch (error) {
      this.logger.warn(`JSON 파싱 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 병합 결과 적용
   */
  private applyMerging(
    groups: NormalizedGroup[],
    llmResponse: LLMClusteringResponse,
  ): MergedCluster[] {
    const groupMap = new Map<string, NormalizedGroup>();
    groups.forEach((g) => groupMap.set(g.id, g));

    const usedIds = new Set<string>();
    const clusters: MergedCluster[] = [];

    // 병합된 그룹 처리
    for (const merged of llmResponse.mergedGroups) {
      const validIds = merged.mergedIds.filter(
        (id) => groupMap.has(id) && !usedIds.has(id),
      );

      if (validIds.length < 2) continue;

      const mergedQuestions: MergedCluster['questions'] = [];
      let totalFrequency = 0;

      for (const id of validIds) {
        const group = groupMap.get(id)!;
        mergedQuestions.push(...group.questions);
        totalFrequency += group.frequency;
        usedIds.add(id);
      }

      clusters.push({
        id: crypto.randomUUID(),
        representativeQuestion: merged.representativeQuestion,
        frequency: totalFrequency,
        questions: mergedQuestions,
        isMerged: true,
        mergedFromIds: validIds,
      });
    }

    // 병합되지 않은 그룹 추가
    for (const group of groups) {
      if (!usedIds.has(group.id)) {
        clusters.push({
          id: group.id,
          representativeQuestion: group.representativeQuestion,
          frequency: group.frequency,
          questions: group.questions,
          isMerged: false,
        });
      }
    }

    // 빈도순 정렬
    return clusters.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * NormalizedGroup을 MergedCluster로 변환 (병합 없이)
   */
  private convertToMergedClusters(groups: NormalizedGroup[]): MergedCluster[] {
    return groups.map((g) => ({
      id: g.id,
      representativeQuestion: g.representativeQuestion,
      frequency: g.frequency,
      questions: g.questions,
      isMerged: false,
    }));
  }
}
