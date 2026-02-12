# Plan: FE/BE 독립 Docker 컨테이너 구성

## 목표
- FE(Next.js), BE(NestJS)를 각각 독립적인 Docker 이미지로 빌드
- docker-compose 없이 개별 `docker run`으로 실행
- 플랫폼에 무관하게 (로컬, K8s, Cloud Run 등) 어디서든 동작
- 컨테이너 간 통신은 **환경변수**로 주입하여 추상화

## 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                   실행 환경 (K8s / Docker / VM)       │
│                                                       │
│  ┌──────────────┐          ┌──────────────────┐      │
│  │   Frontend    │ ──API──▶│    Backend        │      │
│  │  (Next.js)    │         │   (NestJS)        │      │
│  │  Port: 3001   │         │  Port: 3000       │      │
│  │               │         │                    │      │
│  │ ENV:          │         │ ENV:               │      │
│  │ NEXT_PUBLIC_  │         │ GOOGLE_APPLICATION │      │
│  │ API_URL=      │         │ _CREDENTIALS=      │      │
│  │ http://BE:3000│         │ /secrets/sa.json   │      │
│  └──────────────┘          └──────────────────┘      │
│         ▲                           ▲                 │
│         │                           │                 │
│    Port Expose               Volume Mount             │
│    or Ingress             service-account.json        │
└─────────────────────────────────────────────────────┘
```

### 통신 시나리오별 실행 방법

**1) 로컬 Docker Network (개발/테스트)**
```bash
docker network create ola-net
docker run -d --name backend --network ola-net -p 3000:3000 \
  -v $(pwd)/secrets:/secrets:ro \
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/service-account.json \
  ola-backend:latest
docker run -d --name frontend --network ola-net -p 3001:3001 \
  -e NEXT_PUBLIC_API_URL=http://backend:3000 \
  ola-frontend:latest
```

**2) K8s (프로덕션)**
- 각 Deployment + Service로 배포
- FE의 환경변수에 BE Service DNS 주입: `NEXT_PUBLIC_API_URL=http://backend-svc:3000`
- 또는 Ingress에서 path 기반 라우팅 (`/api/*` → backend)

**3) 별도 서버 (VM 각각)**
- BE 서버 IP를 FE 환경변수에 직접 주입: `NEXT_PUBLIC_API_URL=http://10.0.1.5:3000`

## 구현 계획

### Task 1: Backend Dockerfile 작성
**파일**: `apps/backend/Dockerfile`

Multi-stage 빌드:
- **Stage 1 (base)**: Node 22-slim + pnpm 설치
- **Stage 2 (deps)**: 의존성 설치 (frozen-lockfile)
- **Stage 3 (build)**: shared-types 빌드 → Prisma generate → NestJS 빌드
- **Stage 4 (runner)**: 프로덕션 실행 (node dist/main)

핵심 설계:
- `service-account.json`은 이미지에 포함하지 않음 (보안)
- 런타임에 `-v` 또는 K8s Secret으로 마운트
- `DATABASE_URL`, `GCP_PROJECT_ID` 등은 환경변수로 주입
- Prisma DB 파일은 볼륨으로 영속화 (`/app/data`)
- 헬스체크 엔드포인트 활용 (`/health`)

### Task 2: Frontend Dockerfile 작성
**파일**: `apps/frontend-next/Dockerfile`

Multi-stage 빌드:
- **Stage 1 (base)**: Node 22-slim + pnpm
- **Stage 2 (deps)**: 의존성 설치
- **Stage 3 (build)**: shared-types 빌드 → Next.js 빌드 (standalone output)
- **Stage 4 (runner)**: `.next/standalone/server.js` 실행

핵심 설계:
- `output: 'standalone'` 이미 설정됨 → node_modules 불필요한 경량 이미지
- `NEXT_PUBLIC_API_URL`은 **빌드 타임 ARG + 런타임 ENV** 이중 지원
  - 빌드 시: `--build-arg NEXT_PUBLIC_API_URL=...` (SSG 페이지용)
  - 런타임: 환경변수 오버라이드 (SSR/API Route용)
- non-root 유저로 실행 (보안)

### Task 3: .dockerignore 작성
**파일**: `.dockerignore`

빌드 컨텍스트에서 제외:
- `node_modules`, `.next`, `dist` (빌드 산출물)
- `.env*`, `service-account.json` (시크릿)
- `.git`, `*.md` (불필요 파일)

### Task 4: 실행 가이드 문서
**파일**: `docs/docker-guide.md`

내용:
- 이미지 빌드 명령어
- 로컬 실행 (Docker Network)
- K8s 배포 시 환경변수 설정 가이드
- 환경변수 레퍼런스 테이블
- 트러블슈팅 FAQ

## 기술적 고려사항

### NEXT_PUBLIC_ 환경변수의 특성
- `NEXT_PUBLIC_` 접두사 변수는 **빌드 타임**에 클라이언트 번들에 인라인됨
- 따라서 `NEXT_PUBLIC_API_URL`은 Docker 빌드 시 ARG로 전달해야 함
- SSR에서는 런타임 ENV도 읽을 수 있음
- **현재 코드의 API 호출이 SSR인지 CSR인지에 따라 전략이 달라짐** → 코드 확인 필요

### Prisma/SQLite 영속성
- SQLite DB 파일(`admin.db`)은 컨테이너 내부에 저장되면 컨테이너 재시작 시 소실
- 볼륨 마운트 필요: `-v /host/data:/app/data`
- K8s에서는 PersistentVolumeClaim 사용

### 보안
- service-account.json: 이미지에 절대 포함 X → 런타임 마운트
- .env 파일: 이미지에 포함 X → 환경변수로 주입
- non-root 유저로 컨테이너 실행
- 최소 베이스 이미지 (node:22-slim)

## 예상 산출물
1. `apps/backend/Dockerfile` - BE 멀티스테이지 빌드
2. `apps/frontend-next/Dockerfile` - FE 멀티스테이지 빌드 (standalone)
3. `.dockerignore` - 빌드 컨텍스트 최적화
4. `docs/docker-guide.md` - 실행/배포 가이드
