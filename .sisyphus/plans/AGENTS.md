<!-- Parent: ../AGENTS.md -->
# Plans

## Purpose
Prometheus 에이전트가 생성한 작업 계획(work plan) 파일들을 보관합니다. 각 플랜은 복잡한 작업의 단계별 실행 계획을 담고 있습니다.

## Key Files
- `*.md` - 개별 작업 계획 파일들

## For AI Agents
- 계획 검토: `/review` 명령으로 Momus 에이전트가 평가
- 새 계획 생성: `/plan` 또는 `/prometheus` 명령 사용
- 계획 파일은 Markdown 형식

## Dependencies
- Prometheus 플래닝 에이전트
- Momus 리뷰 에이전트
