<!-- Parent: ../AGENTS.md -->
# src

## Purpose
NestJS 백엔드 애플리케이션의 소스 코드입니다. 모듈화된 구조로 BigQuery 연동, 캐싱, ML 기반 이상 탐지 기능을 제공합니다.

## Key Files
- `main.ts` - 애플리케이션 부트스트랩, Swagger/CORS 설정
- `app.module.ts` - 루트 모듈, 전역 ConfigModule 및 모든 모듈 import
- `app.controller.ts` - 헬스체크 엔드포인트
- `app.service.ts` - 기본 서비스

## Subdirectories
- `metrics/` - 메트릭 API 모듈 (핵심 비즈니스 로직, 데이터소스 중립적)
- `cache/` - node-cache 기반 인메모리 캐싱 서비스
- `datasource/` - 데이터 소스 추상화 레이어 (BigQuery/PostgreSQL/MySQL 지원)
- `ml/` - 머신러닝/이상 탐지 모듈
- `common/` - 공통 유틸리티, 전략 패턴
- `admin/` - 어드민 서비스 레이어 (인증, 사용자 관리, LLM 분석)
- `batch-analysis/` - 배치 분석 파이프라인 모듈 (일별 채팅 품질 분석, 스케줄링)
- `quality/` - 챗봇 품질 분석 모듈 (감정 분석 서비스)
- `notifications/` - 알림 서비스 모듈 (Slack 알림)
- `chatbot/` - 글로벌 플로팅 AI 챗봇 모듈 (페이지 컨텍스트 기반 대화)

## For AI Agents
- NestJS 모듈 구조를 따름 (module, controller, service 패턴)
- 새 기능 추가 시 별도 모듈 생성 후 `app.module.ts`에 import
- 환경변수는 ConfigService를 통해 접근
