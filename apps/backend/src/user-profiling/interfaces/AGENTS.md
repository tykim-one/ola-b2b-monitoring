<!-- Parent: ../AGENTS.md -->
# Interfaces

## Purpose
사용자 프로파일링 도메인의 TypeScript 인터페이스를 정의합니다. 사용자 카테고리, 감정 분석, 행동 패턴 등의 데이터 구조를 명시합니다.

## Key Files
- `user-profiling.interface.ts` - 사용자 프로필 인터페이스 (카테고리 분포, 감정 분석, 활동 패턴)

## For AI Agents
- 사용자 = x_enc_data로 식별되는 개별 사용자
- 카테고리 = 질문 유형 분류 (기술, 비즈니스, 일반 등)
- 감정 분석 = positive/negative/neutral

## Dependencies
- 서비스 레이어에서 구현
- BigQuery request_metadata.x_enc_data 기반
