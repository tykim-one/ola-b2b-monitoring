<!-- Parent: ../AGENTS.md -->
# ml

## Purpose
머신러닝 및 통계 기반 분석 모듈입니다. 현재 이상 탐지(Anomaly Detection) 기능을 제공합니다.

## Key Files
- `ml.module.ts` - ML 모듈 정의, AnomalyModule import

## Subdirectories
- `anomaly/` - Z-Score 기반 이상 탐지 서비스

## For AI Agents
- 새로운 ML 기능 추가 시 별도 서브모듈로 생성
- ML 모듈은 BigQueryService에 의존하여 데이터 조회
