<!-- Parent: ../AGENTS.md -->
# widgets

## Purpose
FSD(Feature-Sliced Design) 아키텍처의 Widget 레이어입니다. 여러 컴포넌트를 조합한 복합 위젯을 포함합니다.

## Subdirectories
- `log-table-widget/` - 로그 테이블 위젯
- `project-switcher/` - 프로젝트 전환 위젯

## For AI Agents
- Widget은 entities와 features를 조합
- 각 위젯은 index.ts로 public API 노출
- UI 컴포넌트는 ui/ 서브디렉토리에 위치
