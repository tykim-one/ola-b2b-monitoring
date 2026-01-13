<instruction>You are an expert software engineer. You are working on a WIP branch. Please run `git status` and `git diff` to understand the changes and the current state of the code. Analyze the workspace context and complete the mission brief.</instruction>
<workspace_context>
<artifacts>
--- CURRENT TASK CHECKLIST ---
# NestJS Backend Setup for GCP BigQuery Pipeline

## Monorepo Planning
- [x] Research monorepo structure options
- [x] Create detailed monorepo plan
- [x] Get user approval for monorepo approach

## Monorepo Setup
- [x] Create pnpm workspace configuration
- [x] Set up root package.json
- [x] Create apps/ directory structure
- [x] Migrate frontend code to apps/frontend
- [x] Create backend scaffold in apps/backend

## Backend Infrastructure
- [x] Initialize NestJS project
- [x] Configure TypeScript and build settings
- [x] Set up environment configuration
- [x] Install required dependencies

## GCP BigQuery Integration
- [x] Install BigQuery client library
- [x] Create BigQuery service module
- [x] Configure GCP credentials
- [x] Set up connection configuration
- [ ] Implement query methods
- [x] Add seeding functionality (commented out)

## API Structure
- [x] Create BigQuery controller
- [x] Create BigQuery service
- [x] Define DTOs for data transfer
- [x] Set up error handling

## Documentation
- [x] Create monorepo structure plan
- [x] Document development workflow
- [x] Add setup instructions
- [x] Implement Swagger API documentation
- [x] Document Seeding API usage

--- IMPLEMENTATION PLAN ---
# NestJS Backend Setup for GCP BigQuery Pipeline

프로젝트에 NestJS API 백엔드를 추가하여 GCP BigQuery 데이터를 불러오는 파이프라인을 구축합니다.

## User Review Required

> [!IMPORTANT]
> **프로젝트 구조 결정**
> - 현재 프로젝트는 React + Vite 프론트엔드입니다
> - NestJS 백엔드를 별도 디렉토리(`/backend` 또는 `/api`)에 생성할 예정입니다
> - 모노레포 구조를 원하시는지, 아니면 별도 프로젝트로 분리할지 확인이 필요합니다

> [!IMPORTANT]
> **GCP 인증 방식**
> - Service Account JSON 키 파일을 사용할 예정입니다
> - 환경변수로 `GOOGLE_APPLICATION_CREDENTIALS` 경로를 설정합니다
> - 보안을 위해 키 파일은 `.gitignore`에 추가됩니다

## Proposed Changes

### Backend Directory Structure

프로젝트 루트에 `backend` 디렉토리를 생성하여 NestJS 애플리케이션을 구성합니다.

```
/Users/tykim/Documents/ola-b2b-monitoring/
├── backend/                    # NestJS 백엔드
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── bigquery/
│   │   │   ├── bigquery.module.ts
│   │   │   ├── bigquery.controller.ts
│   │   │   ├── bigquery.service.ts
│   │   │   └── dto/
│   │   └── config/
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
├── (기존 프론트엔드 파일들)
```

---

### NestJS Core Setup

#### [NEW] [backend/package.json](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/package.json)

NestJS 및 BigQuery 관련 의존성을 포함한 package.json 생성:
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`
- `@google-cloud/bigquery` - GCP BigQuery 클라이언트
- `@nestjs/config` - 환경변수 관리
- `class-validator`, `class-transformer` - DTO 검증

#### [NEW] [backend/tsconfig.json](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/tsconfig.json)

NestJS에 최적화된 TypeScript 설정

#### [NEW] [backend/nest-cli.json](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/nest-cli.json)

NestJS CLI 설정 파일

#### [NEW] [backend/.env.example](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/.env.example)

환경변수 템플릿:
- `PORT` - API 서버 포트
- `GCP_PROJECT_ID` - GCP 프로젝트 ID
- `GOOGLE_APPLICATION_CREDENTIALS` - Service Account 키 파일 경로
- `BIGQUERY_DATASET` - BigQuery 데이터셋 이름

---

### Application Bootstrap

#### [NEW] [backend/src/main.ts](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/src/main.ts)

NestJS 애플리케이션 진입점:
- CORS 설정 (프론트엔드 연동)
- Global validation pipe 설정
- 포트 설정 및 서버 시작

#### [NEW] [backend/src/app.module.ts](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/src/app.module.ts)

루트 모듈:
- ConfigModule 설정 (환경변수)
- BigQueryModule import

---

### BigQuery Module

#### [NEW] [backend/src/bigquery/bigquery.module.ts](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/src/bigquery/bigquery.module.ts)

BigQuery 기능을 캡슐화하는 모듈

#### [NEW] [backend/src/bigquery/bigquery.service.ts](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/src/bigquery/bigquery.service.ts)

BigQuery 비즈니스 로직:
- BigQuery 클라이언트 초기화
- 쿼리 실행 메서드
- 데이터 변환 로직
- 에러 핸들링

#### [NEW] [backend/src/bigquery/bigquery.controller.ts](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/src/bigquery/bigquery.controller.ts)

REST API 엔드포인트:
- `POST /bigquery/query` - 커스텀 쿼리 실행
- `GET /bigquery/datasets` - 데이터셋 목록 조회
- `GET /bigquery/tables/:datasetId` - 테이블 목록 조회

#### [NEW] [backend/src/bigquery/dto/query.dto.ts](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/src/bigquery/dto/query.dto.ts)

데이터 전송 객체:
- `QueryDto` - 쿼리 요청 DTO
- `QueryResultDto` - 쿼리 결과 DTO

---

### Configuration

#### [MODIFY] [.gitignore](file:///Users/tykim/Documents/ola-b2b-monitoring/.gitignore)

백엔드 관련 파일 추가:
- `backend/.env`
- `backend/dist/`
- `backend/node_modules/`
- `*.json` (Service Account 키 파일)

#### [NEW] [backend/README.md](file:///Users/tykim/Documents/ola-b2b-monitoring/backend/README.md)

백엔드 설정 및 실행 가이드

## Verification Plan

### Setup Verification
1. 백엔드 디렉토리에서 의존성 설치 확인
   ```bash
   cd backend
   pnpm install
   ```

2. 환경변수 설정 확인
   ```bash
   cp .env.example .env
   # .env 파일 편집
   ```

3. 개발 서버 실행 확인
   ```bash
   pnpm run start:dev
   ```

### API Testing
1. Health check 엔드포인트 테스트
2. BigQuery 연결 테스트
3. 샘플 쿼리 실행 테스트

### Manual Verification
- GCP Console에서 BigQuery API 활성화 확인
- Service Account 권한 확인 (BigQuery Data Viewer, BigQuery Job User)
- 프론트엔드에서 API 호출 테스트
</artifacts>
</workspace_context>
<mission_brief>[Describe your task here...]</mission_brief>