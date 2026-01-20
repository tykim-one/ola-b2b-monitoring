<!-- Parent: ../AGENTS.md -->

# Session Analysis Components

세션 분석 관련 재사용 가능한 UI 컴포넌트

## Purpose

세션 분석 기능의 UI 컴포넌트를 관리합니다. 세션 타임라인 시각화, 대화 내역 표시 등을 담당합니다.

## Key Files

| File | Description |
|------|-------------|
| `SessionTimelineModal.tsx` | 세션 상세 타임라인 모달 (대화 내역, LLM 분석 버튼) |

## For AI Agents

- 세션 분석 UI 관련 수정 시 이 디렉토리 확인
- 새 UI 컴포넌트 추가 시 이 디렉토리에 생성
- 스타일 패턴: 다크 모드, emerald 색상 테마, font-mono
- lucide-react 아이콘 사용

## Dependencies

- `@/services/sessionAnalysisService`: API 호출
- lucide-react: 아이콘
