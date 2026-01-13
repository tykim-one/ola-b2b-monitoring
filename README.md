# OLA B2B Monitoring - Monorepo

GCP BigQuery 데이터를 불러오는 B2B 로그 모니터링 시스템입니다.

## 프로젝트 구조

```
ola-b2b-monitoring/
├── apps/
│   ├── frontend/          # React + Vite 프론트엔드
│   └── backend/           # NestJS API 백엔드
├── package.json           # 루트 package.json (workspace 설정)
└── pnpm-workspace.yaml    # pnpm workspace 설정
```

## 시작하기

### 1. 환경 변수 설정

#### Backend (`apps/backend/.env`)
```env
PORT=3000
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
BIGQUERY_DATASET=your_dataset_name
CORS_ORIGIN=http://localhost:5173
```

### 2. 개발 서버 실행

**루트 디렉토리에서 실행:**

```bash
# 전체 스택 동시 실행
pnpm dev

# 개별 실행
pnpm dev:frontend  # 프론트엔드만
pnpm dev:backend   # 백엔드만
```

## API 엔드포인트

- `POST /bigquery/query` - 커스텀 SQL 쿼리 실행
- `GET /bigquery/datasets` - 데이터셋 목록 조회
- `GET /bigquery/tables/:datasetId` - 테이블 목록
- `GET /bigquery/logs?limit=100` - 샘플 로그 조회

## 기술 스택

- **Frontend**: React 19, Vite, Tailwind CSS, Recharts
- **Backend**: NestJS, @google-cloud/bigquery, TypeScript
