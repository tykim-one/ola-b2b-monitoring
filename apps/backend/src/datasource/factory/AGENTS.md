<!-- Parent: ../AGENTS.md -->

# DataSource Factory

데이터 소스 인스턴스의 생성 및 관리를 담당하는 팩토리 모듈입니다.

## Purpose

- **팩토리 패턴**: 설정 기반으로 적절한 데이터 소스 인스턴스 생성
- **인스턴스 캐싱**: 프로젝트별 데이터 소스 인스턴스 재사용
- **멀티 프로젝트 지원**: 프로젝트별로 다른 데이터 소스 타입 사용 가능

## Key Files

| File | Description |
|------|-------------|
| `datasource.factory.ts` | 메인 팩토리 클래스 - 인스턴스 생성/캐싱/관리 |
| `index.ts` | 모듈 재export |

## DataSourceFactory

### 주요 메서드

```typescript
class DataSourceFactory {
  // 프로젝트별 데이터 소스 가져오기 (캐싱됨)
  async getDataSource(projectId?: string): Promise<MetricsDataSource>;

  // 내부: 타입별 인스턴스 생성
  private createDataSource(config: DataSourceConfig): MetricsDataSource;

  // 모든 인스턴스 정리
  async disposeAll(): Promise<void>;
}
```

### 인스턴스 생성 로직

```typescript
switch (config.type) {
  case 'bigquery':
    return new BigQueryMetricsDataSource(config.config);
  case 'postgresql':
    return new PostgresMetricsDataSource(config.config); // future
  case 'mysql':
    return new MySQLMetricsDataSource(config.config); // future
}
```

## For AI Agents

### 새 데이터 소스 타입 추가 시

1. `createDataSource()` 메서드의 switch문에 새 케이스 추가
2. 해당 구현체를 `../implementations/`에서 import

### 주의사항

- **싱글톤 패턴**: 같은 projectId로 여러 번 요청해도 동일 인스턴스 반환
- **lifecycle 관리**: `disposeAll()`로 모든 연결 정리 가능
- **설정 의존**: `DataSourceConfigService`에서 설정 로드

## Dependencies

- `../implementations/`: 실제 구현체들
- `../datasource.config.ts`: 설정 로드 서비스
- `../interfaces/`: 타입 정의
