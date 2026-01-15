<!-- Parent: ../AGENTS.md -->
# anomaly

## Purpose
Z-Score 기반 이상 탐지 서비스입니다. 토큰 사용량, 에러율, 트래픽 스파이크 등의 이상 패턴을 감지합니다.

## Key Files
- `anomaly.module.ts` - 이상 탐지 모듈 정의
- `anomaly.service.ts` - 이상 탐지 로직 (Z-Score 계산, 심각도 판단)
- `anomaly.controller.ts` - 이상 탐지 API 엔드포인트

## For AI Agents
- **Z-Score 임계값**: |Z| >= 2 (경고), |Z| >= 3 (이상치)
- **심각도 레벨**: low, medium, high, critical
- **탐지 대상**: 토큰 사용량, 에러율, 트래픽 스파이크
- `detectAllAnomalies()` 메서드로 종합 이상 탐지 실행

## Interfaces
- `AnomalyResult` - 이상 탐지 결과 (tenant_id, metric, value, zScore, severity)
- `AnomalyStats` - 테넌트별 통계 (평균, 표준편차, p99)
