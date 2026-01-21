# OLA B2B Monitoring 프로젝트 비판적 리뷰

> 작성일: 2026-01-21
> 리뷰 범위: 백엔드, 프론트엔드, 인프라 전체

## 종합 평가: C+ (6.2/10)

좋은 아키텍처 기반을 갖추고 있으나, **프로덕션 배포에 치명적인 결함**이 다수 존재합니다.

---

## 1. 현재 상태 요약

### 강점 (잘 된 부분)

| 영역 | 등급 | 설명 |
|------|------|------|
| 모듈 구조 | A- | 21개 NestJS 모듈의 명확한 분리 |
| 캐싱 전략 | A | 3단계 TTL (SHORT/MEDIUM/LONG) 정교한 설계 |
| DataSource 추상화 | A- | BigQuery 외 다른 DB 확장 용이한 인터페이스 패턴 |
| Compound 컴포넌트 | A | Dashboard, Chart 등 교과서적 구현 |
| 상태 관리 | A- | Context + Zustand + React Query 균형잡힌 하이브리드 |
| API 클라이언트 | A | 토큰 갱신 큐, 인터셉터 패턴 우수 |
| 타입 안전성 | A- | shared-types 패키지로 FE/BE 타입 공유 |

### 치명적 결함 (반드시 수정 필요)

| 문제 | 심각도 | 영향 |
|------|--------|------|
| **테스트 커버리지 5%** | CRITICAL | 298줄 AuthService 포함 모든 핵심 로직 미테스트 |
| **CI/CD 없음** | CRITICAL | 수동 배포, 자동화 부재, 품질 게이트 없음 |
| **API 키 Git 노출** | CRITICAL | Gemini API Key, Slack Webhook URL 커밋됨 |
| **SQLite 프로덕션** | CRITICAL | 동시 쓰기 불가, 락 발생, HA 불가 |
| **SQL 인젝션 위험** | CRITICAL | QueryDto로 임의 SQL 실행 가능 |
| **코드 스플리팅 없음** | HIGH | 80+ 파일 단일 번들, 초기 로딩 과다 |
| **접근성 부재** | HIGH | ARIA 속성 거의 없음, 스크린 리더 미지원 |
| **에러 핸들링 불일치** | HIGH | 전역 예외 필터 없음, 스택 트레이스 노출 |
| **모니터링/로깅 부족** | HIGH | APM 없음, 구조화 로깅 없음 |
| **Docker 없음** | MEDIUM | 컨테이너화 미구현, 배포 일관성 부족 |

---

## 2. 영역별 심층 분석

### 2.1 백엔드 아키텍처 (점수: 5.9/10)

#### 좋은 점
- 3계층 DataSource 패턴으로 DB 교체 용이
- JWT + RBAC 인증 체계 잘 구현
- 캐시 서비스 TTL 전략 우수

#### 문제점

**1. 테스트 없음 (95% 미커버)**
- AuthService (298줄): 로그인, 토큰 갱신, 잠금 모두 미테스트
- MetricsService (580줄): 캐싱 로직 미테스트
- 배치 분석 스케줄러: 미테스트

**2. SQL 인젝션 취약점**
```typescript
@Post('query')
async executeQuery(@Body() queryDto: QueryDto) {
  // queryDto.query가 검증 없이 BigQuery로 전달됨
}
```

**3. 전역 에러 핸들링 부재**
- Error, HttpException, UnauthorizedException 혼용
- 스택 트레이스가 클라이언트에 노출

### 2.2 프론트엔드 아키텍처 (점수: 6.8/10)

#### 좋은 점
- Compound 컴포넌트 패턴 교과서적 구현
- React Query 캐싱이 백엔드 TTL과 정렬됨
- Zustand 셀렉터 훅으로 불필요한 리렌더 방지

#### 문제점

**1. 번들 최적화 없음**
- React.lazy() 미사용
- 80+ 파일이 단일 청크로 번들
- 관리자 라우트 16개도 초기 로드에 포함

**2. 접근성 D+ 등급**
- aria-label 1개만 발견 (챗봇 버튼)
- 폼 입력에 htmlFor, aria-required 없음
- 모달에 role="dialog" 없음
- 로딩 상태 aria-busy 없음

**3. React.memo 부재**
- Recharts 컴포넌트 (비싼 DOM diffing) 메모이제이션 없음

### 2.3 인프라 (점수: 2.75/10)

#### 치명적 결함

**1. 비밀키 Git 노출**
```
GOOGLE_GEMINI_API_KEY=AIzaSyCuoHkT...  <- 커밋됨!
SLACK_WEBHOOK_URL=https://hooks.slack.com/...  <- 커밋됨!
```

**2. CI/CD 완전 부재**
- .github/workflows/ 없음
- 린트/테스트/빌드 자동화 없음
- 배포 파이프라인 없음

**3. SQLite 프로덕션 사용**
- 동시 쓰기 지원 안됨
- 부하 시 DB 락 발생
- 복제/장애조치 불가

**4. Docker 미구현**
- Dockerfile 없음
- docker-compose.yml 없음
- 배포 환경 일관성 보장 안됨

**5. 모니터링 부재**
- APM 없음 (New Relic, Datadog 등)
- 구조화 로깅 없음
- 헬스체크 엔드포인트 없음 (/health, /ready)

---

## 3. 미래 지향적 개선 방향

### Phase 1: 긴급 보안 수정 (1주차)

1. **Git에서 비밀키 제거 및 순환**
   - BFG 또는 git filter-branch로 히스토리에서 삭제
   - 모든 노출된 자격증명 즉시 순환
   - GCP Secret Manager 도입

2. **SQL 인젝션 수정**
   - QueryDto에 SQL 길이 제한 추가
   - 커스텀 쿼리 엔드포인트 관리자 전용으로 제한
   - 매개변수화된 쿼리 사용

3. **전역 예외 필터 추가**
   ```typescript
   @Catch()
   export class GlobalExceptionFilter implements ExceptionFilter {
     catch(exception: unknown, host: ArgumentExecutionContext) {
       // 표준화된 에러 응답
       // 프로덕션에서 스택 트레이스 숨김
     }
   }
   ```

### Phase 2: 품질 기반 구축 (2-3주차)

1. **CI/CD 파이프라인 구축**
   ```yaml
   # .github/workflows/ci.yml
   jobs:
     lint:
       - pnpm lint
     test:
       - pnpm test
     build:
       - pnpm build
     deploy-staging:
       - 조건: PR
     deploy-production:
       - 조건: main 브랜치
   ```

2. **핵심 테스트 추가**
   - AuthService 단위 테스트 (로그인, 토큰 갱신, 잠금)
   - MetricsService 통합 테스트
   - E2E: 로그인 -> 대시보드 -> 분석 플로우

3. **Docker 컨테이너화**
   ```dockerfile
   # 멀티 스테이지 빌드
   FROM node:20-alpine AS builder
   # 빌드 단계
   FROM node:20-alpine AS runner
   # 프로덕션 런타임
   ```

### Phase 3: 성능 최적화 (4-5주차)

1. **프론트엔드 번들 최적화**
   - 관리자 라우트 동적 임포트
   - React.memo로 차트 컴포넌트 래핑
   - 번들 분석 도구 도입

2. **데이터베이스 마이그레이션**
   - SQLite -> PostgreSQL (Cloud SQL)
   - 커넥션 풀링 설정
   - 자동 백업 전략

3. **모니터링 구축**
   - 구조화 로깅 (Winston/Pino)
   - Sentry 에러 트래킹
   - 헬스체크 엔드포인트

### Phase 4: 확장성 준비 (6-8주차)

1. **접근성 (a11y) 개선**
   - eslint-plugin-jsx-a11y 도입
   - 모든 폼에 ARIA 속성 추가
   - 키보드 네비게이션 지원
   - 스크린 리더 테스트

2. **API 버저닝**
   - `/api/v1/...` 패턴 도입
   - 하위 호환성 전략 수립

3. **확장 아키텍처**
   - 마이크로서비스 분리 검토 (배치 분석, 알림)
   - 이벤트 기반 아키텍처 고려 (Pub/Sub)
   - 캐시 레이어 강화 (Redis)

---

## 4. 기술 부채 우선순위 매트릭스

```
          긴급함
            ^
   +--------+--------+
   | P0     | P1     |
   | 보안   | 품질   |
   | 수정   | 기반   |
   +--------+--------+
   | P2     | P3     |
   | 성능   | 확장   |
   | 최적화 | 준비   |
   +--------+--------+
        영향도 ->
```

| 우선순위 | 항목 | 예상 공수 |
|----------|------|-----------|
| P0 | 비밀키 제거 + 순환 | 2-3시간 |
| P0 | SQL 인젝션 수정 | 3-4시간 |
| P0 | 전역 예외 필터 | 2-3시간 |
| P1 | CI/CD 파이프라인 | 6-8시간 |
| P1 | AuthService 테스트 | 5-6시간 |
| P1 | Docker 구성 | 4-5시간 |
| P2 | 프론트엔드 코드 스플리팅 | 4-6시간 |
| P2 | PostgreSQL 마이그레이션 | 8-10시간 |
| P3 | 접근성 개선 | 10-15시간 |

---

## 5. 결론

### 프로젝트의 현재 위치
- **개발 단계**: 좋은 아키텍처 패턴과 확장 가능한 구조
- **프로덕션 준비**: **불가능** - 보안, 테스트, 인프라 결함

### 핵심 권장사항
1. **즉시**: Git에서 비밀키 제거하고 모든 자격증명 순환
2. **1주 내**: CI/CD 파이프라인과 기본 테스트 구축
3. **1개월 내**: PostgreSQL 마이그레이션, Docker 컨테이너화
4. **지속적**: 테스트 커버리지 70%+ 목표, 접근성 WCAG 2.1 AA 준수

### 프로덕션 배포 전 필수 체크리스트

- [ ] 모든 비밀키 환경 변수로 이동
- [ ] CI/CD 파이프라인 활성화
- [ ] AuthService 테스트 커버리지 80%+
- [ ] SQLite -> PostgreSQL 마이그레이션
- [ ] 전역 예외 필터 적용
- [ ] 헬스체크 엔드포인트 구현
- [ ] HTTPS 강제
- [ ] Rate limiting 적용

---

## 수정 대상 주요 파일

### 백엔드
- `apps/backend/src/main.ts` - 전역 필터, 검증 파이프 추가
- `apps/backend/src/metrics/queries/custom-query.controller.ts` - SQL 인젝션 수정
- `apps/backend/src/admin/auth/auth.service.ts` - 테스트 추가
- `apps/backend/.env` - 비밀키 제거

### 프론트엔드
- `apps/frontend-next/next.config.ts` - 코드 스플리팅 설정
- `apps/frontend-next/src/components/charts/*.tsx` - React.memo 적용
- `apps/frontend-next/src/app/dashboard/admin/*` - 동적 임포트

### 인프라
- `.github/workflows/ci.yml` - CI/CD 파이프라인 (신규)
- `Dockerfile` - 백엔드/프론트엔드 (신규)
- `docker-compose.yml` - 로컬 개발 환경 (신규)
