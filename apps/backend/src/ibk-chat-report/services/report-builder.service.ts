import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../admin/analysis/llm/llm.service';
import { CollectedReportData } from '../interfaces/ibk-chat-report.interface';

const IBKCHAT_REPORT_SYSTEM_PROMPT = `당신은 금융 챗봇 로그를 분석하는 데이터 분석가입니다. 주어지는 하루치 로그 집계 데이터를 기반으로 일일 리포트를 작성합니다.

핵심 목표: 1) 챗봇 품질 향상에 직접 연결되는 인사이트와 액션 아이템 도출 2) 잘 답변하는 질문 유형 및 대표 질문 리스트 추출 3) 답변 성공 여부와 무관하게 수준 있는 질문(영양가 있는 질문) 추출 4) 클러스터링 결과 포함

제약: 입력 데이터에 없는 사실을 추정하거나 만들어내지 않습니다. 출력은 한국어(존댓말)로 작성합니다.

반드시 다음 섹션을 포함하여 Markdown으로 작성하세요:
A. 챗봇이 잘 답변하는 질문 유형 (성공률 표 + 대표질문 10개/유형 + 답변 포맷 특징)
B. 수준있는질문 Top30 (점수+태그+실패시 response_node+fail_reason+한줄코멘트)
   선정기준: 기간/비교/근거/리스크/산출물 중 2개 이상 충족
C. 실패 원인 Top10 + 유형별 대표질문 5개 + 개선 액션
D. 토큰 P50/P90/P99/Max + 폭증 케이스(>20k) Top20 + 완화책
E. 클러스터링: 고정클러스터 Top10 표(question_type 기준) + 탐사용 신규 트렌드 클러스터 3개(대표질문5개+2줄요약+운영라벨편입제안)
F. 추천 질문 프롬프트 20개 (잘답변10개+수준있는10개, 사용자가 그대로 쓸 수 있는 문장)
G. 내일 액션 아이템 Top5 (기대효과+우선순위)

표준 용어: 성공=response_node가 FINAL인 경우, 실패=AMBIGUOUS/UNSUPPORTED/SAFETY/ETN`;

@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  constructor(private readonly llmService: LLMService) {}

  buildContext(data: CollectedReportData): string {
    const { targetDate, kpi, questionTypeStats, representativeQuestions, failAnalysis, tokenBurstCases, highValueQuestions, exploratoryClusterSamples } = data;

    const sections: string[] = [];

    sections.push(`# IBK-CHAT 일일 데이터 요약 (대상 날짜: ${targetDate})`);

    sections.push(`
## 1. KPI 집계
- 총 요청: ${kpi.totalRequests}건, 성공(FINAL): ${kpi.successCount}건 (${kpi.successRate}%)
- 실패: ${kpi.failCount}건 (AMBIGUOUS/UNSUPPORTED/SAFETY/ETN 포함)
- 토큰 통계: P50=${kpi.p50Tokens}, P90=${kpi.p90Tokens}, P99=${kpi.p99Tokens}, Max=${kpi.maxTokens}`);

    if (questionTypeStats.length > 0) {
      const rows = questionTypeStats
        .map((s) => `| ${s.questionType} | ${s.total} | ${s.successRate}% |`)
        .join('\n');
      sections.push(`
## 2. 질문 유형별 성공률
| 질문유형 | 건수 | 성공률 |
|---------|------|--------|
${rows}`);
    }

    if (representativeQuestions.length > 0) {
      const grouped = new Map<string, typeof representativeQuestions>();
      for (const q of representativeQuestions) {
        const existing = grouped.get(q.questionType) ?? [];
        existing.push(q);
        grouped.set(q.questionType, existing);
      }
      let repText = '\n## 3. 유형별 대표 질문 샘플 (각 최대 10개)\n';
      for (const [type, questions] of grouped) {
        repText += `\n### ${type}\n`;
        for (const q of questions) {
          repText += `- ${q.userInput} [${q.responseNode}${q.failReason ? `, ${q.failReason}` : ''}]\n`;
        }
      }
      sections.push(repText);
    }

    if (failAnalysis.length > 0) {
      let failText = '\n## 4. 실패 원인 분석 (Top10)\n';
      for (const f of failAnalysis) {
        failText += `\n### ${f.failCategory} (${f.responseNode}) — ${f.count}건\n`;
        for (const q of f.sampleQuestions.slice(0, 5)) {
          failText += `- ${q}\n`;
        }
      }
      sections.push(failText);
    }

    if (tokenBurstCases.length > 0) {
      let tokenText = '\n## 5. 토큰 폭증 케이스 (>20,000 토큰, Top20)\n';
      for (const t of tokenBurstCases) {
        tokenText += `- [${t.questionType}] ${t.userInput} — ${t.totalTokens} tokens (in:${t.inputTokens} out:${t.outputTokens}) [${t.responseNode}]\n`;
      }
      sections.push(tokenText);
    }

    if (highValueQuestions.length > 0) {
      let hvText = '\n## 6. 수준있는질문 후보 Top30 (휴리스틱 점수 기준)\n';
      for (const q of highValueQuestions) {
        hvText += `- [score:${q.score}, tags:${q.tags.join('/')}] ${q.userInput} [${q.responseNode}${q.failReason ? `, ${q.failReason}` : ''}]\n`;
      }
      sections.push(hvText);
    }

    if (exploratoryClusterSamples.length > 0) {
      let clusterText = '\n## 7. 탐사용 클러스터링 샘플 (OTHER/미분류, 최대 100개)\n';
      for (const c of exploratoryClusterSamples) {
        clusterText += `- [${c.questionType}] ${c.userInput} [${c.responseNode}]\n`;
      }
      sections.push(clusterText);
    }

    return sections.join('\n');
  }

  async generateReport(data: CollectedReportData): Promise<string> {
    const context = this.buildContext(data);

    this.logger.log(
      `Generating report for ${data.targetDate}, context length: ${context.length} chars`,
    );

    const response = await this.llmService.generateAnalysis([
      { role: 'system', content: IBKCHAT_REPORT_SYSTEM_PROMPT },
      { role: 'user', content: context },
    ]);

    if (!response.content) {
      throw new Error('LLM returned empty response');
    }

    this.logger.log(
      `Report generated: ${response.content.length} chars, ${response.inputTokens ?? 0} input / ${response.outputTokens ?? 0} output tokens`,
    );

    return response.content;
  }
}
