/**
 * FAQ Cluster Interfaces
 *
 * FAQ 분석에서 사용되는 인터페이스 정의
 */

/**
 * BigQuery에서 추출된 원본 질문
 */
export interface RawQuestion {
  userInput: string;
  tenantId: string;
  count: number;
}

/**
 * 정규화된 텍스트로 그룹화된 질문
 */
export interface NormalizedGroup {
  id: string;
  normalizedText: string;
  representativeQuestion: string;
  frequency: number;
  questions: {
    text: string;
    count: number;
    tenantId: string;
  }[];
}

/**
 * LLM에 의해 병합된 클러스터
 */
export interface MergedCluster {
  id: string;
  representativeQuestion: string;
  frequency: number;
  questions: {
    text: string;
    count: number;
    tenantId: string;
  }[];
  isMerged: boolean;
  mergedFromIds?: string[];
}

/**
 * 최종 FAQ 클러스터 (사유 분석 포함)
 */
export interface FAQCluster {
  id: string;
  representativeQuestion: string;
  frequency: number;
  questions: {
    text: string;
    count: number;
    tenantId: string;
  }[];
  reasonAnalysis: string;
  isMerged: boolean;
}

/**
 * LLM 클러스터링 응답 형식
 */
export interface LLMClusteringResponse {
  mergedGroups: {
    representativeQuestion: string;
    mergedIds: string[];
    reason: string;
  }[];
  unmergedIds: string[];
}
