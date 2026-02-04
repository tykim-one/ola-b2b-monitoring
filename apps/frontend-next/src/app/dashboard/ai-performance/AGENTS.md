<!-- Parent: ../AGENTS.md -->
# ai-performance

## Purpose
AI 성능 분석 페이지입니다. 이상 탐지 통계, 토큰 효율성, 응답 품질 등을 분석합니다.

## Key Files
- `page.tsx` - AI 성능 KPI, 이상 탐지 차트, 품질 지표

## For AI Agents
- **이상 탐지**: Z-Score 기반 이상치 탐지 (토큰 사용량, 응답 시간 등)
- **토큰 효율성**: 입력 대비 출력 비율 분석
- **품질 지표**: 성공률, 평균 응답 길이 등

## Dependencies
- Backend: `/api/ai/anomaly-stats` (이상 탐지 통계)
- Hooks: use-dashboard.ts
- ML Service: anomaly.service.ts (Z-Score 계산)
