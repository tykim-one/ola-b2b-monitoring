import { Injectable } from '@nestjs/common';
import {
  CandidateQuestion,
  ScoredQuestion,
} from '../interfaces/ibk-chat-report.interface';

const SCORING_CRITERIA: Record<string, string[]> = {
  기간: [
    '까지', '이후', '동안', '전', '기간', '추이', '변화', '흐름',
    '최근', '작년', '전년', '분기', '월별', '연간',
  ],
  비교: [
    '대비', '비교', 'vs', '차이', '높은', '낮은', '많은', '적은',
    '초과', '미만', '상위', '하위', '순위',
  ],
  근거: [
    '이유', '원인', '왜', '근거', '기준', '어떻게', '어떤 이유',
    '배경', '원리',
  ],
  리스크: [
    '위험', '손실', '리스크', '변동성', '하락', '손해', '방어',
    '헤지', '최악', '불안',
  ],
  산출물: [
    '계산', '수익률', '금액', '예상', '추정', '구해', '알려줘',
    '얼마', '몇 %', '환산', '환율',
  ],
};

@Injectable()
export class QuestionScorerService {
  scoreQuestion(question: CandidateQuestion): ScoredQuestion {
    const inputLower = question.userInput.toLowerCase();
    const matchedTags: string[] = [];

    for (const [tag, keywords] of Object.entries(SCORING_CRITERIA)) {
      const hasMatch = keywords.some((keyword) =>
        inputLower.includes(keyword.toLowerCase()),
      );
      if (hasMatch) {
        matchedTags.push(tag);
      }
    }

    const score = Math.min(matchedTags.length * 2, 10);

    return {
      ...question,
      score,
      tags: matchedTags,
    };
  }

  scoreAll(questions: CandidateQuestion[]): ScoredQuestion[] {
    return questions.map((q) => this.scoreQuestion(q));
  }

  getTop30(questions: CandidateQuestion[]): ScoredQuestion[] {
    const scored = this.scoreAll(questions);
    return scored
      .filter((q) => q.tags.length >= 2)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.totalTokens - a.totalTokens;
      })
      .slice(0, 30);
  }
}
