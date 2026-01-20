<!-- Parent: ../AGENTS.md -->
# user-profiling

## Purpose
사용자 프로파일링 UI 컴포넌트입니다. 사용자별 행동 패턴, 카테고리 분포, 감정 분석 결과를 시각화합니다.

## Key Files
- `UserProfileSummary.tsx` - 사용자 프로필 요약 카드
- `SentimentIndicator.tsx` - 감정 분석 인디케이터
- `CategoryDistribution.tsx` - 카테고리 분포 차트
- `index.ts` - 컴포넌트 export

## For AI Agents
- 'use client' 컴포넌트 (클라이언트 사이드 렌더링)
- Tailwind CSS 다크 테마 (bg-slate-800, border-slate-700)
- lucide-react 아이콘 사용
- userProfilingService.ts에서 API 호출

## Dependencies
- `@/services/userProfilingService` - API 클라이언트
- `lucide-react` - 아이콘
- `recharts` - 차트 라이브러리
