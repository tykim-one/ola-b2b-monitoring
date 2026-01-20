<!-- Parent: ../AGENTS.md -->
# backend

## Purpose
NestJS 기반 REST API 서버입니다. GCP BigQuery 기반 B2B LLM 로그 모니터링, JWT+RBAC 인증, 배치 분석 파이프라인, AI 챗봇을 제공합니다.

### Core Architecture
**Three-Layer DataSource Pattern:**
```
Controller (metrics.controller.ts)
    ↓
Service (metrics.service.ts) — 캐싱 래퍼
    ↓
DataSource Interface (MetricsDataSource) — 추상화 계층
    ↓
BigQueryMetricsDataSource / MySQLMetricsDataSource / ... — 실제 쿼리 실행
```

새 데이터소스 추가 시 `MetricsDataSource` 인터페이스만 구현하면 됩니다.

## Key Files
- `src/main.ts` - 애플리케이션 엔트리포인트, Swagger 설정, CORS, 전역 가드 설정
- `src/app.module.ts` - 루트 모듈, 전역 ConfigModule, 모든 하위 모듈 import
- `.env` - 환경변수 (GCP, JWT, LLM, Slack 설정)
- `package.json` - 의존성 및 스크립트 정의
- `nest-cli.json` - NestJS CLI 설정

## Subdirectories
- `src/admin/` - [관리자 모듈](src/admin/AGENTS.md) (JWT 인증, 사용자/역할 관리, LLM 분석)
- `src/batch-analysis/` - [배치 분석 파이프라인](src/batch-analysis/AGENTS.md) (일일 자동 채팅 품질 분석)
- `src/cache/` - 캐싱 서비스 (node-cache, SHORT/MEDIUM/LONG TTL)
- `src/chatbot/` - 글로벌 플로팅 AI 챗봇 (페이지 컨텍스트 기반)
- `src/common/` - 공통 유틸리티 (전략 패턴, 데코레이터)
- `src/datasource/` - DataSource 추상화 계층 (인터페이스, 구현체, 팩토리)
- `src/metrics/` - 메트릭 API (데이터소스 중립적 컨트롤러, 서비스)
- `src/ml/anomaly/` - Z-Score 기반 이상 탐지
- `src/notifications/` - Slack 웹훅 알림 서비스
- `src/quality/` - 챗봇 품질 분석 (감정 분석)
- `prisma/` - [Prisma 스키마](prisma/AGENTS.md) (SQLite + libSQL, 사용자/역할/권한)
- `config/` - 설정 파일 (datasources.config.json)
- `test/` - E2E 테스트

## For AI Agents

### Development Commands
```bash
pnpm start:dev          # 개발 서버 (또는 루트에서 pnpm dev:backend)
pnpm test               # 전체 단위 테스트
pnpm test:watch         # 워치 모드
pnpm test -- --testPathPattern="bigquery"  # 특정 테스트
pnpm test:e2e           # E2E 테스트
pnpm test:cov           # 커버리지 리포트
pnpm lint               # ESLint
```

### Prisma Commands
```bash
pnpm prisma:generate    # Prisma 클라이언트 생성
pnpm prisma db push     # 스키마 적용 (SQLite)
pnpm prisma:seed        # 시드 데이터 (admin@ola.com / admin123)
pnpm prisma:studio      # Prisma Studio GUI
pnpm prisma:migrate     # 마이그레이션 실행
```

### Authentication & Authorization
- **JWT 인증**: Access Token (15분) + Refresh Token (7일, httpOnly 쿠키)
- **전역 가드 순서**: JwtAuthGuard → PermissionsGuard → ThrottlerGuard
- **공개 엔드포인트**: `@Public()` 데코레이터로 인증 우회
- **권한 검사**: `@Permissions('resource:action')` 데코레이터 사용

### Adding New DataSource
1. `src/datasource/implementations/`에 구현체 생성
2. `MetricsDataSource` 인터페이스 구현 (15개 메서드)
3. `datasource.factory.ts`에 케이스 추가
4. `config/datasources.config.json`에 프로젝트별 설정 추가

### API Documentation
- 개발 서버 실행 후 `http://localhost:3000/api-docs` 접속 (Swagger UI)

### Environment Variables
`.env` 파일에 다음 설정 필요:
- GCP_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS, BIGQUERY_DATASET, BIGQUERY_TABLE
- JWT_SECRET (32자 이상 권장)
- LLM_PROVIDER, GEMINI_MODEL, GOOGLE_GEMINI_API_KEY
- SLACK_WEBHOOK_URL (선택)

## Dependencies
- `@google-cloud/bigquery` - BigQuery 클라이언트
- `@nestjs/*` - NestJS 프레임워크 (core, common, platform-express)
- `@nestjs/jwt` / `@nestjs/passport` - JWT 인증
- `@nestjs/schedule` - 크론 스케줄링 (배치 분석용)
- `@prisma/client` - Prisma ORM (SQLite + libSQL)
- `@google/generative-ai` - Gemini LLM SDK
- `node-cache` - 인메모리 캐싱
- `class-validator` / `class-transformer` - DTO 유효성 검사
- `cookie-parser` - 쿠키 파싱 (리프레시 토큰용)
- `bcrypt` - 비밀번호 해싱
- `@ola/shared-types` - 프론트엔드와 공유하는 TypeScript 타입
