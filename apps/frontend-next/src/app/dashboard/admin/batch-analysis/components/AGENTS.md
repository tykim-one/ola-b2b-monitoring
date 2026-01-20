# Batch Analysis Components

<!-- Parent: ../AGENTS.md -->

## Purpose

배치 분석 기능을 위한 재사용 가능한 UI 컴포넌트들을 제공합니다. 주로 모달, 폼, 대화형 컴포넌트를 포함하며, 배치 분석 작업 생성 및 관리를 위한 인터페이스를 담당합니다.

## Key Files

- **CreateJobModal.tsx** - 배치 분석 작업 생성 모달 컴포넌트
  - 작업 생성 폼 제공 (대상 날짜, 테넌트 ID, 샘플 사이즈, 프롬프트 템플릿)
  - 프롬프트 템플릿 목록 로드 및 선택
  - 기본값 설정 (어제 날짜, 샘플 사이즈 100)
  - 폼 검증 및 제출 처리
  - 사이버펑크 스타일 UI (cyan 테마, 모노스페이스 폰트)
- **ChatQualityTab.tsx** - 채팅 품질 분석 탭
  - 점수 그리드 (Quality, Relevance, Completeness, Clarity)
  - 감정 분석 배지 (positive/neutral/negative)
  - 이슈/개선사항 리스트
- **FAQAnalysisTab.tsx** - FAQ 분석 탭
  - FAQ 클러스터링 결과 표시
  - 빈도 분석 차트
- **SessionAnalysisTab.tsx** - 세션 분석 탭
  - 세션 해결률 통계
  - 효율성 분석 (평균 턴 수)
  - 세션 타임라인 뷰

## For AI Agents

배치 분석 작업 생성/관리와 관련된 새로운 모달이나 폼 컴포넌트를 추가할 때:
- 일관된 사이버펑크 UI 스타일 유지 (bg-slate-900, border-cyan-500, font-mono)
- `@/services/batchAnalysisService`에서 API 클라이언트 import
- 폼 검증 및 에러 처리 포함
- 로딩 상태 표시 (Loader2 아이콘 사용)
- 모달 backdrop 클릭 시 닫기 기능
- 성공 시 콜백으로 부모 컴포넌트에 알림

## Related Components

- `@/services/batchAnalysisService` - 배치 분석 API 클라이언트
- `lucide-react` - 아이콘 라이브러리 (X, Calendar, Loader2 등)
