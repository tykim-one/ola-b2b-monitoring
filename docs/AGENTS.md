<!-- Parent: ../AGENTS.md -->
# docs

## Purpose
프로젝트 문서화 디렉토리. 백엔드/프론트엔드 아키텍처, API 명세, 학습 자료를 포함합니다.

## Key Files
- `README.md` - 문서 네비게이션 허브, 대상별 추천 문서 가이드

## Subdirectories
- `backend/` - 백엔드 기술 문서 (아키텍처, API, DB 스키마)
- `frontend/` - 프론트엔드 기술 문서 (아키텍처, 라우팅)
- `learning/` - NestJS, DataSource 패턴 등 학습 자료
- `guides/` - ETL 타겟 데이터 CSV 파일

## For AI Agents
- 문서 구조 변경 시 README.md의 목차도 함께 업데이트
- backend/, frontend/ 하위 문서는 코드 변경 시 최신화 필요
- learning/ 문서는 개념 설명용으로 코드 변경과 무관하게 유지

## Dependencies
- 루트 CLAUDE.md와 내용 일관성 유지 필요
