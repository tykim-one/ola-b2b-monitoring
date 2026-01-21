<!-- Parent: ../AGENTS.md -->
# Interfaces

## Purpose
FAQ 분석 도메인의 TypeScript 인터페이스를 정의합니다. 클러스터링 결과, 질문 그룹 등의 데이터 구조를 명시합니다.

## Key Files
- `faq-cluster.interface.ts` - FAQ 클러스터 인터페이스 (질문 그룹, 유사도 점수 등)

## For AI Agents
- 비즈니스 로직의 타입 계약 정의
- 서비스 레이어에서 이 인터페이스 사용
- 새 기능 추가 시 인터페이스 먼저 설계

## Dependencies
- 서비스 (`services/`)에서 구현
- DTO (`dto/`)에서 참조
