<!-- Parent: ../AGENTS.md -->
# Skills

## Purpose
Claude Code의 커스텀 스킬 정의 파일들을 보관합니다. 스킬은 특정 작업을 수행하는 재사용 가능한 명령 템플릿입니다.

## Key Files
- `sync-structure.md` - Notion 구조 동기화 스킬 정의

## For AI Agents
- 스킬 호출: `/skill-name` 형태로 사용
- 새 스킬 추가: `.md` 파일로 프롬프트 템플릿 작성
- Claude Code 설정에서 스킬 활성화 필요

## Dependencies
- Claude Code CLI
- 스킬별 외부 의존성 (Notion API 등)
