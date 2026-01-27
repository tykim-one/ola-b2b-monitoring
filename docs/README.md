# OLA B2B Monitoring 문서

B2B LLM 서비스의 로그를 모니터링하고 분석하는 대시보드 시스템의 공식 문서입니다.

---

## 문서 구조

```
docs/
├── README.md                # 이 문서 (네비게이션 허브)
├── backend/                 # 백엔드 기술 문서
│   ├── ARCHITECTURE.md      # 아키텍처 설계도
│   ├── API_REFERENCE.md     # API 엔드포인트 명세
│   └── DATABASE_SCHEMA.md   # 데이터베이스 스키마
├── frontend/                # 프론트엔드 기술 문서
│   ├── ARCHITECTURE.md      # 아키텍처 설계도
│   └── ROUTES.md            # 라우팅 및 페이지 구조
└── learning/                # 학습 자료
    └── *.md                 # NestJS, DataSource 패턴 등
```

---

## 문서 목차

### Backend

| 문서 | 설명 | 추천 대상 |
|------|------|----------|
| [ARCHITECTURE.md](./backend/ARCHITECTURE.md) | 모듈 구조, Three-Layer 패턴, 인증 흐름, 캐싱 전략 | 백엔드 개발자 |
| [API_REFERENCE.md](./backend/API_REFERENCE.md) | REST API 전체 엔드포인트 명세 (100+) | 프론트엔드/백엔드 개발자 |
| [DATABASE_SCHEMA.md](./backend/DATABASE_SCHEMA.md) | Prisma(SQLite) + BigQuery 스키마 | 백엔드 개발자 |

### Frontend

| 문서 | 설명 | 추천 대상 |
|------|------|----------|
| [ARCHITECTURE.md](./frontend/ARCHITECTURE.md) | 컴포넌트 구조, 상태관리, API 클라이언트 | 프론트엔드 개발자 |
| [ROUTES.md](./frontend/ROUTES.md) | 페이지 라우팅, 레이아웃 구조, 접근 제어 | 프론트엔드 개발자 |

### Learning Materials

| 문서 | 설명 |
|------|------|
| [01-data-access-patterns.md](./learning/01-data-access-patterns.md) | 데이터 접근 패턴 |
| [02-nestjs-di-concepts.md](./learning/02-nestjs-di-concepts.md) | NestJS 의존성 주입 |
| [03-codebase-interface-analysis.md](./learning/03-codebase-interface-analysis.md) | 인터페이스 분석 |
| [04-codebase-factory-analysis.md](./learning/04-codebase-factory-analysis.md) | 팩토리 패턴 분석 |
| [05-codebase-module-service.md](./learning/05-codebase-module-service.md) | 모듈/서비스 구조 |
| [06-extension-guide.md](./learning/06-extension-guide.md) | 확장 가이드 |
| [07-domain-based-aggregation.md](./learning/07-domain-based-aggregation.md) | 도메인 기반 집계 |

---

## 대상별 추천 문서

### 백엔드 개발자
1. [Backend ARCHITECTURE](./backend/ARCHITECTURE.md) - 모듈 구조, 패턴 이해
2. [API_REFERENCE](./backend/API_REFERENCE.md) - API 엔드포인트 확인
3. [DATABASE_SCHEMA](./backend/DATABASE_SCHEMA.md) - DB 작업 시 참고

### 프론트엔드 개발자
1. [Frontend ARCHITECTURE](./frontend/ARCHITECTURE.md) - 컴포넌트, 상태관리
2. [ROUTES](./frontend/ROUTES.md) - 페이지 구조 파악
3. [API_REFERENCE](./backend/API_REFERENCE.md) - API 연동 시 참고

### 신규 팀원 온보딩
1. 루트 [CLAUDE.md](../CLAUDE.md) - 프로젝트 전체 개요
2. [Backend ARCHITECTURE](./backend/ARCHITECTURE.md) 또는 [Frontend ARCHITECTURE](./frontend/ARCHITECTURE.md)
3. [Learning Materials](./learning/) - 패턴 및 개념 학습

---

## 빠른 시작

### 로컬 개발 환경 실행
```bash
# 의존성 설치
pnpm install

# 전체 스택 실행 (백엔드 + 프론트엔드)
pnpm dev:all
```

### 접속 URL
- **프론트엔드**: http://localhost:3001
- **백엔드 API**: http://localhost:3000
- **기본 관리자 계정**: admin@ola.com / admin123

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **메트릭 대시보드** | 실시간 KPI, 시간별/일별 트래픽, 테넌트 사용량 |
| **품질 분석** | 토큰 효율성, 쿼리-응답 상관관계, 반복 패턴 |
| **챗봇 품질** | 감정 분석, 세션 해결률, FAQ 클러스터링 |
| **유저 분석** | 사용자별 활동, 카테고리 분류, 프로파일링 |
| **배치 분석** | 일일 자동 품질 분석, LLM 기반 인사이트 |
| **ETL 모니터링** | Wind/Minkabu ETL 파이프라인 상태 모니터링 |
| **어드민** | 사용자/역할 관리, JWT 인증, RBAC |

---

## 기술 스택

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: SQLite (Prisma), BigQuery
- **Auth**: JWT + Refresh Token
- **LLM**: Gemini, OpenAI, Anthropic

### Frontend
- **Framework**: Next.js 16, React 19
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State**: React Context, React Query

---

## 문서 업데이트 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-23 | 2.0.0 | 문서 구조 재정비 (backend/frontend 분리) |
| 2025-01-19 | 1.0.0 | 최초 문서 작성 |
