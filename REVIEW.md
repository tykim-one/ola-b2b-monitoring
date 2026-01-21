# OLA B2B Monitoring 프로젝트 비판적 리뷰

## 개요

OLA B2B Monitoring은 GCP BigQuery 기반 B2B LLM 로그 모니터링 대시보드입니다. 전반적으로 **좋은 설계 의도**를 보여주지만, 확장성, 보안, 운영 준비성 측면에서 개선이 필요합니다.

---

## 1. 아키텍처 문제점

### 1.1 데이터소스 추상화 불완전 (Critical)

**문제**: DataSource 추상화 패턴을 도입했으나 **완전히 마이그레이션되지 않음**

```
MetricsService
├── @Inject(METRICS_DATASOURCE)  ← 새 추상화
└── bigQueryClient               ← 레거시 직접 접근 (중복!)

BatchAnalysisService
└── bigQueryClient               ← 추상화 무시
```

**영향 범위**:
- `apps/backend/src/metrics/metrics.service.ts:40-67` - 이중 클라이언트 초기화
- `apps/backend/src/batch-analysis/batch-analysis.service.ts:69-101` - DataSource 우회

**결과**: 데이터소스 교체(MySQL, PostgreSQL 등) 시 모든 서비스를 수정해야 함

### 1.2 God Service 안티패턴

**문제**: `BatchAnalysisService`가 **1,384줄**로 단일 책임 원칙 위반

```
BatchAnalysisService (1,384 lines)
├── Job 관리 (CRUD)
├── 실행 로직
├── 스케줄링
├── 프롬프트 템플릿 관리
├── 이슈 빈도 분석
└── 통계 집계
```

**권장**: 5개 서비스로 분리 필요
- `BatchJobService`
- `BatchExecutionService`
- `PromptTemplateService`
- `BatchScheduleService`
- `IssueAnalysisService`

### 1.3 메모리 누수 위험

| 위치 | 문제 |
|------|------|
| `chatbot.service.ts:62` | `Map<string, ChatSession>` - TTL/크기 제한 없음 |
| `datasource.factory.ts:16` | DataSource 인스턴스 무한 캐시 |
| `operations/page.tsx` | `setInterval` 정리 안 됨 |

---

## 2. 보안 취약점

### 2.1 인증 우회 (Critical)

```typescript
// apps/backend/src/metrics/metrics.controller.ts:17
@Public()  // ⚠️ 모든 메트릭 엔드포인트 공개
@Controller('api/metrics')
export class MetricsController { ... }
```

**영향**: 인증 없이 모든 비즈니스 메트릭 접근 가능

### 2.2 입력 검증 부재

```typescript
// SQL 파라미터 직접 삽입 (검증 없음)
`INTERVAL ${days} DAY`  // apps/backend/src/batch-analysis/batch-analysis.service.ts:1303
```

**위험**: `days`, `limit`, `offset` 등 사용자 입력값 검증 없음

### 2.3 민감 데이터 노출

- 사용자 입력/LLM 응답이 PII 스크러빙 없이 저장됨
- JWT 시크릿 강도 검증 없음

---

## 3. 확장성 제약

### 3.1 인메모리 의존성

| 컴포넌트 | 현재 | 문제 |
|----------|------|------|
| 캐시 | NodeCache | 다중 인스턴스 지원 불가 |
| 세션 | Map | 서버 재시작 시 손실 |
| Rate Limiting | In-memory | 분산 환경 무력화 |

**해결**: Redis 도입 필요

### 3.2 N+1 쿼리 문제

```typescript
// apps/backend/src/batch-analysis/batch-analysis.service.ts:394-426
for (const job of jobs) {
  // 개별 집계 쿼리 실행 (N+1)
}
```

**해결**: `GROUP BY jobId` 단일 쿼리로 변경

### 3.3 동기 처리 병목

```typescript
// LLM 분석 순차 처리 (100ms 딜레이 × 100개 = 10초+)
for (const sample of samples) {
  await this.analyzeSingleSample(sample);
  await new Promise(r => setTimeout(r, 100));
}
```

**해결**: `Promise.all()` + 동시성 제한 (5-10개)

---

## 4. 프론트엔드 문제점

### 4.1 상태 관리 불일치

| 페이지 | 패턴 |
|--------|------|
| Dashboard | React Query ✓ |
| Operations | 수동 fetch ✗ |
| Chatbot | Context ✓ |

**문제**: 동일 프로젝트 내 3가지 다른 데이터 패칭 패턴

### 4.2 접근성(A11y) 부재

- ARIA 속성 거의 없음 (2개만 발견)
- 차트에 `role="img"`, `aria-label` 없음
- 테이블 정렬에 `aria-sort` 없음
- 키보드 네비게이션 미지원

### 4.3 성능 최적화 부재

- 차트 데이터 변환에 `useMemo` 없음
- 코드 스플리팅/레이지 로딩 없음
- 대용량 데이터테이블 가상화 없음

### 4.4 하드코딩된 프로젝트 ID

```typescript
// 여러 페이지에서 반복
const PROJECT_ID = 'ibks';  // ⚠️ 동적 선택 불가
```

---

## 5. 인프라 부재

### 5.1 컨테이너화 없음 (Critical)

- Dockerfile 없음
- docker-compose.yml 없음
- **결과**: GCP Cloud Run, Kubernetes 배포 불가

### 5.2 CI/CD 없음 (Critical)

- GitHub Actions 워크플로우 없음
- 자동화된 테스트/빌드/배포 없음
- **결과**: 수동 배포, 품질 게이트 없음

### 5.3 관측성(Observability) 없음

| 영역 | 상태 |
|------|------|
| 구조화된 로깅 | ❌ console.log 사용 |
| 에러 트래킹 | ❌ Sentry 없음 |
| 메트릭 | ❌ Prometheus 없음 |
| 분산 추적 | ❌ OpenTelemetry 없음 |
| 헬스체크 | ❌ /health 엔드포인트 없음 |

### 5.4 환경 설정 문제

```
Backend .env.example:  PORT=3001
Frontend expects:      NEXT_PUBLIC_API_URL=http://localhost:3000
```

**문제**: 포트 불일치 + 필수 환경변수 누락

---

## 6. 테스트 커버리지 부재 (Critical)

### 현재 상태
- 유닛 테스트: **1개** (`app.controller.spec.ts`)
- E2E 테스트: **1개** (`app.e2e-spec.ts`)
- 커버리지: **~0%**

### 테스트 없는 핵심 코드
- `BigQueryMetricsDataSource` (모든 데이터 접근)
- `MetricsService` (비즈니스 로직)
- `BatchAnalysisService` (1,384줄)
- `AuthService` (인증 로직)
- 모든 Guard/Strategy

**위험**: 리팩토링/변경 시 회귀 테스트 불가

---

## 7. 개선 우선순위

### Priority 1: 즉시 수정 (보안/안정성)

| 항목 | 작업 | 영향도 |
|------|------|--------|
| 메트릭 인증 | `@Public()` 제거, API 키 또는 JWT 적용 | Critical |
| 입력 검증 | DTO + class-validator 추가 | High |
| 세션 누수 | TTL 기반 eviction 구현 | High |
| 환경변수 | 포트 통일, 검증 스키마 추가 | High |

### Priority 2: 확장성 개선

| 항목 | 작업 | 영향도 |
|------|------|--------|
| Redis 도입 | 캐시/세션/Rate Limiting 분산화 | High |
| DataSource 마이그레이션 | 레거시 BigQuery 직접 접근 제거 | High |
| N+1 쿼리 수정 | GROUP BY 단일 쿼리로 변경 | Medium |
| LLM 병렬화 | Promise.all + 동시성 제한 | Medium |

### Priority 3: 인프라 구축

| 항목 | 작업 | 영향도 |
|------|------|--------|
| Docker | 멀티스테이지 Dockerfile 작성 | Critical |
| CI/CD | GitHub Actions 워크플로우 추가 | Critical |
| 헬스체크 | /health 엔드포인트 구현 | Medium |
| 로깅 | Winston/Pino 구조화 로깅 | Medium |

### Priority 4: 코드 품질

| 항목 | 작업 | 영향도 |
|------|------|--------|
| 서비스 분리 | BatchAnalysisService 5개로 분할 | Medium |
| 테스트 추가 | 핵심 서비스 70% 커버리지 목표 | High |
| 접근성 | ARIA 속성 및 키보드 네비게이션 | Medium |
| 프로젝트 동적화 | 하드코딩된 PROJECT_ID 제거 | Low |

---

## 8. 장기 권장사항

### 8.1 데이터베이스 전략
- **현재**: SQLite (admin.db) - 단일 인스턴스 제한
- **권장**: PostgreSQL(Cloud SQL)로 마이그레이션 (다중 인스턴스 지원)
- **백업**: GCP Cloud Storage 일일 백업 자동화

### 8.2 마이크로서비스 고려
현재 모놀리식 구조가 적합하나, 향후 트래픽 증가 시:
- Batch Analysis → 별도 서비스 (큐 기반)
- Chatbot → 별도 서비스 (WebSocket 전용)
- Metrics → 읽기 전용 리플리카

### 8.3 비용 최적화
- BigQuery 슬롯 예약 검토 (예측 가능한 비용)
- 캐시 TTL 최적화 (불필요한 쿼리 감소)
- LLM 호출 배칭 (API 비용 절감)

### 8.4 모니터링 대시보드
- Grafana 대시보드 구성 (시스템 메트릭)
- 알림 규칙 설정 (에러율, 응답 시간)
- SLO/SLI 정의 (99.9% 가용성 목표)

---

## 9. 결론

### 강점
- 명확한 3계층 DataSource 추상화 설계 의도
- RBAC 기반 견고한 인증 시스템
- 풍부한 공유 타입 정의 (90+ 인터페이스)
- 모던 스택 (NestJS, Next.js 16, React 19)

### 약점
- **테스트 없음**: 회귀 위험 높음
- **인프라 부재**: 프로덕션 배포 불가
- **확장성 제약**: 인메모리 의존성
- **보안 허점**: 메트릭 공개 노출

### 프로덕션 준비도

| 영역 | 상태 |
|------|------|
| 로컬 개발 | ✅ 양호 |
| 보안 | ⚠️ 주요 허점 존재 |
| 확장성 | ⚠️ 단일 인스턴스 한정 |
| 컨테이너화 | ❌ 없음 |
| CI/CD | ❌ 없음 |
| 테스트 | ❌ ~0% 커버리지 |
| 관측성 | ❌ 없음 |

**최종 평가**: MVP로서 기능은 완성되었으나, **프로덕션 배포 전 1-2주 인프라 작업 필수**

---

## 10. 다음 단계

1. **즉시**: 메트릭 API 인증 추가 (보안 Critical)
2. **1주차**: Docker + CI/CD 구축
3. **2주차**: Redis 도입 + 테스트 추가
4. **3주차**: 관측성 스택 구성
5. **4주차**: 성능 최적화 + 접근성 개선

---

*리뷰 일자: 2026-01-21*
