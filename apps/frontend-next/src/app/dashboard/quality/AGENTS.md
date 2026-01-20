<!-- Parent: ../AGENTS.md -->
# quality

## Purpose
품질 모니터링 대시보드입니다. LLM 응답 품질 분석, 토큰 효율성 트렌드, 질문-응답 상관관계, 반복 질문 패턴(FAQ 후보) 등을 시각화합니다.

## Key Files
- `page.tsx` - 품질 모니터링 대시보드 페이지

## Features
1. **토큰 효율성 트렌드 차트**: 일별 출력/입력 토큰 비율 변화 추적
2. **질문-응답 길이 상관관계**: ScatterPlot으로 입력/출력 길이 간의 상관관계 분석
3. **반복 질문 패턴 테이블**: FAQ 후보 식별을 위한 고빈도 질문 패턴 목록
4. **FAQ 분석 섹션**: 온디맨드 FAQ 클러스터링 및 LLM 기반 사유 분석

## API Endpoints Used
- `GET /quality/efficiency-trend` - 일별 토큰 효율성 트렌드
- `GET /quality/query-response-correlation` - 질문-응답 길이 상관관계 데이터
- `GET /quality/repeated-patterns` - 반복 질문 패턴 (FAQ 후보)

## For AI Agents
- 새 품질 메트릭 추가 시 백엔드 API 먼저 구현 후 프론트엔드 연동
- 차트 컴포넌트는 `src/components/charts/`에 위치
- KPI 카드는 `@/components/kpi/KPICard` 사용
- 데이터 갱신 주기: 15분 (CacheTTL.MEDIUM)
