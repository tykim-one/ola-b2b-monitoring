<!-- Parent: ../AGENTS.md -->
# Interfaces

## Purpose
세션 분석 도메인의 TypeScript 인터페이스를 정의합니다. 세션 통계, 타임라인, 분석 결과 등의 데이터 구조를 명시합니다.

## Key Files
- `session-analysis.interface.ts` - 세션 분석 인터페이스 (해결률, 평균 턴 수, 이탈률 등)
- `index.ts` - 인터페이스 export 인덱스

## For AI Agents
- 세션 = 동일 session_id의 대화 묶음
- 해결 여부는 휴리스틱 + LLM 분석으로 판단
- 효율성 = 적은 턴으로 문제 해결

## Dependencies
- 서비스 레이어에서 구현
- BigQuery request_metadata.session_id 기반
