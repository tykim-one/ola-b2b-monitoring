<!-- Parent: ../AGENTS.md -->
# .sisyphus

## Purpose
Sisyphus 멀티 에이전트 시스템의 런타임 데이터를 저장합니다. 플랜, 상태, 연속 실행 카운트 등을 관리합니다.

## Key Files
- `continuation-count.json` - 연속 실행 카운터 (Ralph Loop 등에서 사용)

## Subdirectories
- `plans/` - 생성된 작업 계획 파일들

## For AI Agents
- **내부 시스템 디렉토리**: 직접 수정 지양
- Sisyphus 시스템이 자동으로 관리
- 디버깅 시 plans/ 확인으로 작업 이력 파악 가능

## Dependencies
- Sisyphus 멀티 에이전트 시스템 (oh-my-claude-sisyphus)
