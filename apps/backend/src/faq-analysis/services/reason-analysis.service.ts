import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../admin/analysis/llm/llm.service';
import { MergedCluster, FAQCluster } from '../interfaces/faq-cluster.interface';

/**
 * Reason Analysis Service
 *
 * LLM을 사용하여 FAQ가 자주 발생하는 근본 원인을 분석
 */
@Injectable()
export class ReasonAnalysisService {
  private readonly logger = new Logger(ReasonAnalysisService.name);

  constructor(private readonly llmService: LLMService) {}

  /**
   * 단일 클러스터의 사유 분석
   */
  async analyzeReason(cluster: MergedCluster): Promise<string> {
    try {
      const prompt = this.buildReasonPrompt(cluster);

      const response = await this.llmService.generateAnalysis([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      // 응답에서 불필요한 부분 제거하고 한 줄로 정리
      const reason = this.cleanReasonResponse(response.content);
      return reason;
    } catch (error) {
      this.logger.error(
        `사유 분석 실패 (클러스터 ${cluster.id}): ${error.message}`,
      );
      return '분석 실패';
    }
  }

  /**
   * 여러 클러스터의 사유 분석 (배치)
   */
  async analyzeReasonsBatch(clusters: MergedCluster[]): Promise<FAQCluster[]> {
    const results: FAQCluster[] = [];

    // 배치로 한 번에 분석 요청 (효율성)
    try {
      const batchPrompt = this.buildBatchReasonPrompt(clusters);

      const response = await this.llmService.generateAnalysis([
        {
          role: 'user',
          content: batchPrompt,
        },
      ]);

      const reasonMap = this.parseBatchReasonResponse(
        response.content,
        clusters,
      );

      for (const cluster of clusters) {
        results.push({
          id: cluster.id,
          representativeQuestion: cluster.representativeQuestion,
          frequency: cluster.frequency,
          questions: cluster.questions,
          reasonAnalysis: reasonMap.get(cluster.id) || '분석 실패',
          isMerged: cluster.isMerged,
        });
      }
    } catch (error) {
      this.logger.error(`배치 사유 분석 실패: ${error.message}`);

      // 실패 시 개별 분석 시도
      for (const cluster of clusters) {
        const reason = await this.analyzeReason(cluster);
        results.push({
          id: cluster.id,
          representativeQuestion: cluster.representativeQuestion,
          frequency: cluster.frequency,
          questions: cluster.questions,
          reasonAnalysis: reason,
          isMerged: cluster.isMerged,
        });
      }
    }

    return results;
  }

  /**
   * 단일 사유 분석 프롬프트 생성
   */
  private buildReasonPrompt(cluster: MergedCluster): string {
    const questionList = cluster.questions
      .slice(0, 5)
      .map((q) => `- "${q.text}" (${q.count}회)`)
      .join('\n');

    return `다음 FAQ 질문에 대해 사용자들이 이 질문을 자주 하는 근본 원인을 한 줄로 분석해주세요.

대표 질문: "${cluster.representativeQuestion}"
총 빈도: ${cluster.frequency}회
포함된 유사 질문들:
${questionList}

응답은 50자 이내의 한 줄로만 작성해주세요. 다른 설명은 포함하지 마세요.
예시: "배송 상태 페이지 접근성 부족으로 인한 반복 문의"`;
  }

  /**
   * 배치 사유 분석 프롬프트 생성
   */
  private buildBatchReasonPrompt(clusters: MergedCluster[]): string {
    const clusterList = clusters
      .map((c, idx) => {
        const questions = c.questions
          .slice(0, 3)
          .map((q) => `"${q.text}"`)
          .join(', ');
        return `${idx + 1}. [ID: ${c.id}] "${c.representativeQuestion}" (빈도: ${c.frequency})
   유사 질문: ${questions}`;
      })
      .join('\n\n');

    return `다음 FAQ 질문들에 대해 각각 사용자들이 이 질문을 자주 하는 근본 원인을 분석해주세요.

${clusterList}

응답은 반드시 아래 JSON 형식으로만 작성해주세요:
{
  "reasons": {
    "클러스터ID": "50자 이내의 원인 분석",
    ...
  }
}

원인 분석 예시:
- "배송 상태 페이지 접근성 부족"
- "결제 수단 안내 부족"
- "반품/교환 절차 복잡성"`;
  }

  /**
   * 배치 사유 분석 응답 파싱
   */
  private parseBatchReasonResponse(
    content: string,
    clusters: MergedCluster[],
  ): Map<string, string> {
    const reasonMap = new Map<string, string>();

    try {
      // JSON 블록 추출
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON 블록을 찾을 수 없음');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.reasons && typeof parsed.reasons === 'object') {
        for (const [id, reason] of Object.entries(parsed.reasons)) {
          if (typeof reason === 'string') {
            reasonMap.set(id, this.cleanReasonResponse(reason));
          }
        }
      }
    } catch (error) {
      this.logger.warn(`배치 응답 파싱 실패: ${error.message}`);

      // 파싱 실패 시 기본값 설정
      for (const cluster of clusters) {
        reasonMap.set(cluster.id, '분석 실패');
      }
    }

    return reasonMap;
  }

  /**
   * 사유 분석 응답 정리
   */
  private cleanReasonResponse(response: string): string {
    // 줄바꿈 제거, 앞뒤 공백 제거, 50자 제한
    let cleaned = response.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // 따옴표 제거
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1);
    }

    // 50자 제한
    if (cleaned.length > 50) {
      cleaned = cleaned.substring(0, 47) + '...';
    }

    return cleaned || '분석 결과 없음';
  }
}
