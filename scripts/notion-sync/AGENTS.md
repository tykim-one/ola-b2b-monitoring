<!-- Parent: ../AGENTS.md -->
# Notion Sync

## Purpose
AGENTS.md 파일들과 비즈니스 문서를 Notion에 동기화하는 스크립트입니다. 코드베이스 문서화를 Notion 워크스페이스와 연동합니다.

## Key Files
- `parse-agents.ts` - AGENTS.md 파일 파싱 로직
- `sync-structure.ts` - Notion 구조 동기화 스크립트
- `sync-business-docs.ts` - 비즈니스 문서 Notion 동기화
- `transform-friendly.ts` - 데이터 변환 유틸리티
- `glossary.json` - 기술 용어집 (코드 용어 → 친숙한 명칭)
- `business-glossary.json` - 비즈니스 용어집

## For AI Agents
- Notion API 키 필요 (환경변수 설정)
- `npm install` 후 TypeScript로 실행
- 동기화 전 glossary 파일 확인하여 용어 매핑 파악

## Dependencies
- Notion API (@notionhq/client)
- TypeScript 런타임 (ts-node)
- 루트 프로젝트의 AGENTS.md 파일들
