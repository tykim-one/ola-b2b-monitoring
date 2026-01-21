<!-- Parent: ../AGENTS.md -->
# Scripts

## Purpose
프로젝트 유틸리티 스크립트들을 포함합니다. 주로 외부 시스템과의 동기화, 데이터 변환, 자동화 작업 등에 사용됩니다.

## Key Files
- (현재 루트 레벨 스크립트 없음)

## Subdirectories
- `notion-sync/` - Notion 동기화 스크립트 (see notion-sync/AGENTS.md)

## For AI Agents
- 이 디렉토리의 스크립트들은 독립적으로 실행 가능
- 메인 애플리케이션과 분리된 의존성 관리 (`package.json`)
- 스크립트 실행 전 해당 디렉토리의 README나 주석 확인 필요

## Dependencies
- 외부 API (Notion 등)
- Node.js 런타임
