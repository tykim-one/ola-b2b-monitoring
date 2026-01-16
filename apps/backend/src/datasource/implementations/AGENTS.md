<!-- Parent: ../AGENTS.md -->

# DataSource Implementations

MetricsDataSource 인터페이스의 실제 구현체들입니다.

## Purpose

- **BigQuery 구현체**: GCP BigQuery를 통한 로그 데이터 쿼리
- **확장 가능**: PostgreSQL, MySQL, MongoDB 등 추가 구현 예정

## Key Files

| File | Description |
|------|-------------|
| `bigquery-metrics.datasource.ts` | BigQuery SQL 쿼리 실행 구현체 (현재 유일한 구현) |
| `index.ts` | 모듈 재export |

## BigQueryMetricsDataSource

### 주요 기능

- BigQuery 클라이언트 초기화 및 연결 관리
- `MetricsQueries`의 SQL 쿼리 실행
- DATE 타입 정규화 (`normalizeDate()` 헬퍼)
- 에러 핸들링 및 로깅

### 사용 패턴

```typescript
// NestJS DI를 통해 주입됨
@Inject(METRICS_DATASOURCE) private dataSource: MetricsDataSource
```

## For AI Agents

### 새 구현체 추가 시

1. `{type}-metrics.datasource.ts` 파일 생성
2. `MetricsDataSource` 인터페이스의 모든 메서드 구현
3. `index.ts`에서 export
4. `../factory/datasource.factory.ts`에 생성 케이스 추가

### BigQuery 쿼리 주의사항

- `success` 필드: `success = TRUE` (BOOL 타입, 문자열 아님)
- 토큰 필드: `CAST(total_tokens AS FLOAT64)` 필요
- DATE 반환값: `{ value: 'YYYY-MM-DD' }` 객체 → `normalizeDate()`로 문자열 변환

## Dependencies

- `@google-cloud/bigquery`: BigQuery 클라이언트
- `../../metrics/queries/metrics.queries.ts`: SQL 쿼리 정의
- `@ola/shared-types`: 반환 타입
