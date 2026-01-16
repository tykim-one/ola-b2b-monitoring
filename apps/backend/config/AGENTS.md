<!-- Parent: ../AGENTS.md -->

# Backend Configuration

백엔드 애플리케이션의 설정 파일들입니다.

## Purpose

- **데이터 소스 설정**: 프로젝트별 데이터베이스 연결 정보
- **환경변수 치환**: `${ENV_VAR}` 패턴으로 환경변수 참조

## Key Files

| File | Description |
|------|-------------|
| `datasources.config.json` | 데이터 소스 설정 (BigQuery, PostgreSQL 등) |

## datasources.config.json

### 구조

```json
{
  "default": {
    "type": "bigquery",
    "config": {
      "projectId": "${GCP_PROJECT_ID}",
      "datasetId": "${BIGQUERY_DATASET}",
      "tableName": "${BIGQUERY_TABLE}",
      "location": "${GCP_BQ_LOCATION}"
    }
  },
  "projects": {
    "project-beta": {
      "type": "postgresql",
      "config": { ... }
    }
  }
}
```

### 환경변수 치환

- `${GCP_PROJECT_ID}`: GCP 프로젝트 ID
- `${BIGQUERY_DATASET}`: BigQuery 데이터셋 이름
- `${BIGQUERY_TABLE}`: 로그 테이블 이름 (기본: logs)
- `${GCP_BQ_LOCATION}`: BigQuery 리전 (기본: asia-northeast3)

## For AI Agents

- **새 프로젝트 추가**: `projects` 객체에 프로젝트별 설정 추가
- **환경변수**: 실제 값은 `apps/backend/.env`에 정의
- **설정 로드**: `src/datasource/datasource.config.ts`가 이 파일을 로드

## Related

- `../src/datasource/`: 설정을 사용하는 데이터 소스 모듈
- `../.env`: 환경변수 정의 파일
