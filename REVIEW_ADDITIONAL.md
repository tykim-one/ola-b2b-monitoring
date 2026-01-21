# OLA B2B Monitoring - 추가 비판적 리뷰

## 개요

기존 REVIEW.md에서 누락된 **42개의 추가 문제점**을 발견했습니다. 이 리뷰는 백엔드, 프론트엔드, 설정/타입 세 영역에 대한 심층 분석 결과입니다.

---

## 1. 보안 취약점 추가 발견 (Critical)

### 1.1 .env 파일에 실제 시크릿 커밋됨 ⚠️ 즉시 조치 필요

**파일**: `apps/backend/.env`

```
Line 20: GOOGLE_GEMINI_API_KEY=AIzaSyCuoHkTIdhNaPmC-9eL3WqBMnXyiTYk1KM  ← 실제 키 노출
Line 24: SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T05RRRLN4MQ/...  ← 실제 웹훅 노출
```

**영향**:
- GCP Gemini API 키 탈취 가능 → 과금 폭탄
- Slack 웹훅으로 가짜 알림 발송 가능

**즉시 조치**:
1. `.env`를 `.gitignore`에 추가
2. 노출된 API 키 즉시 revoke/재발급
3. Slack 웹훅 URL 재생성

### 1.2 API Client 토큰 갱신 Race Condition (Critical)

**파일**: `apps/frontend-next/src/lib/api-client.ts:67-149`

```typescript
let isRefreshing = false;  // 전역 mutable 변수
let failedQueue: Array<...> = [];

// Race condition: isRefreshing이 리셋되는 동안 다른 요청이 큐에 쌓임
if (isRefreshing) {
  // 큐에 추가
} else {
  isRefreshing = true;
  // 갱신 시도...
}
```

**영향**: 동시 다발적 401 응답 시 토큰 갱신 중복 호출, 인증 상태 불일치

### 1.3 Batch Analysis 페이지 JSON.parse 크래시 (Critical)

**파일**: `apps/frontend-next/src/app/dashboard/admin/batch-analysis/[id]/page.tsx:785,800,815`

```typescript
{JSON.parse(result.issues).map(...)}  // try-catch 없음
{JSON.parse(result.improvements).map(...)}  // LLM이 잘못된 JSON 반환하면 페이지 크래시
```

**영향**: 하나의 malformed 분석 결과가 전체 페이지를 크래시시킴

---

## 2. 백엔드 추가 문제점

### 2.1 비동기 초기화 Race Condition (High)

**파일**:
- `apps/backend/src/batch-analysis/batch-analysis.service.ts:92-106`
- `apps/backend/src/faq-analysis/faq-analysis.service.ts:41-55`

```typescript
constructor(...) {
  this.initializeBigQuery();  // await 없이 호출
}

private async initializeBigQuery(): Promise<void> {
  this.bigQueryClient = new BigQuery({...});
}
```

**문제**: 생성자에서 async 메서드를 await 없이 호출. 서비스 메서드가 `this.bigQueryClient`를 사용할 때 아직 null일 수 있음.

**해결**: `OnModuleInit` 라이프사이클 훅 사용

### 2.2 Fire-and-Forget Promise 처리 (High)

**파일**: `apps/backend/src/batch-analysis/batch-analysis.service.ts:494,686-692`

```typescript
// 백그라운드 작업 추적 없음
this.executeJobAsync(jobId).catch((error) => {
  this.logger.error(`Job ${jobId} failed: ${error.message}`);
});

// Slack 알림 실패해도 API는 성공 반환
this.sendAnalysisResultAlert(...).catch((err) => {
  this.logger.warn(`Failed to send alert: ${err.message}`);
});
```

**영향**: 작업 실패 시 사용자에게 알림 없음, 데이터 일관성 문제

### 2.3 JSON 파싱 검증 부재 (High)

**파일**: `apps/backend/src/batch-analysis/batch-analysis.service.ts:126,161,266` 외 다수

```typescript
const issueArray = JSON.parse(result.issues) as string[];  // 검증 없음
```

**문제**: LLM 응답이 예상과 다른 형식이면 서비스 크래시

### 2.4 Promise.all 단일 실패로 전체 실패 (Medium)

**파일**: `apps/backend/src/batch-analysis/batch-analysis.service.ts:378,394`

```typescript
const jobsWithScores = await Promise.all(
  jobs.map(async (job) => {
    const aggregation = await this.prisma.batchAnalysisResult.aggregate({...});
    return {...};
  }),
);
```

**문제**: 하나의 집계 쿼리 실패 시 전체 listJobs 요청 실패

**해결**: `Promise.allSettled()` 사용

### 2.5 Cache Service Race Condition (Medium)

**파일**: `apps/backend/src/cache/cache.service.ts:43-63`

```typescript
async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl): Promise<T> {
  const cached = this.cache.get<T>(key);
  if (cached !== undefined) return cached;

  const value = await fetcher();  // 두 요청이 동시에 여기 도달 가능
  this.cache.set(key, value, ttl);
  return value;
}
```

**영향**: 동시 요청 시 동일 쿼리 중복 실행, 캐싱 효과 감소

### 2.6 트랜잭션 경계 누락 (Medium)

**파일**: `apps/backend/src/batch-analysis/batch-analysis.service.ts:470-490`

```typescript
// 삭제와 업데이트가 별도 트랜잭션
await this.prisma.batchAnalysisResult.deleteMany({ where: { jobId } });
await this.prisma.batchAnalysisJob.update({ where: { id: jobId }, ... });
```

**문제**: 두 작업 사이에 다른 요청이 데이터 삽입 가능

### 2.7 입력값 범위 검증 부재 (Medium)

**파일**: `apps/backend/src/metrics/metrics.controller.ts:89,168,371-372`

```typescript
const limitNum = limit ? parseInt(limit, 10) : 100;  // 상한 없음 → 메모리 폭탄
const daysNum = days ? parseInt(days, 10) : 7;       // 음수 허용 → 전체 데이터 반환
```

### 2.8 Rate Limiting 카운터 미사용 (Low)

**파일**: `apps/backend/src/batch-analysis/batch-analysis.service.ts:617,685`

```typescript
let lowQualityAlertCount = 0;  // 초기화
lowQualityAlertCount++;         // 증가
// 하지만 절대 검사하지 않음 - "최대 5개 알림" 로직 미구현
```

### 2.9 Factory 에러 삼킴 (Medium)

**파일**: `apps/backend/src/datasource/factory/datasource.factory.ts:93-95`

```typescript
const disposePromises = Array.from(this.instances.values()).map((ds) =>
  ds.dispose().catch((err) => {
    this.logger.warn(`Error disposing data source: ${err.message}`);
  }),
);
```

**문제**: 데이터소스 정리 실패 시 로그만 남기고 계속 진행 → 리소스 누수

### 2.10 일반적인 에러 컨텍스트 손실 (Low)

**파일**: `apps/backend/src/metrics/metrics.service.ts:98-104`

```typescript
throw new Error(`BigQuery query failed: ${error.message}`);  // 스택 트레이스 손실
```

**해결**: NestJS 예외 계층 사용 (`BadRequestException`, `InternalServerErrorException`)

---

## 3. 프론트엔드 추가 문제점

### 3.1 ChatWindow 이벤트 리스너 메모리 누수 (High)

**파일**: `apps/frontend-next/src/components/chatbot/ChatWindow.tsx:87-121`

```typescript
useEffect(() => {
  if (isDragging || isResizing) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [isDragging, isResizing]);
```

**문제**: 드래그 중 컴포넌트 언마운트 시 리스너 정리 안 됨

### 3.2 DataTable 배열 인덱스를 key로 사용 (High)

**파일**: `apps/frontend-next/src/components/compound/DataTable/index.tsx:272`

```typescript
{filteredData.map((row, index) => (
  <tr key={index}>  // 안티패턴: 정렬/필터링 시 DOM 재사용 오류
```

### 3.3 ChatbotContext useCallback 의존성 문제 (High)

**파일**: `apps/frontend-next/src/contexts/ChatbotContext.tsx:57-96`

```typescript
const sendMessage = useCallback(
  async (content: string) => {
    // pathname 사용
  },
  [pathname, sessionId]  // pathname 변경마다 콜백 재생성
);
```

**영향**: 라우트 전환 시 불필요한 리렌더링

### 3.4 하드코딩된 프로젝트 ID (Medium)

**파일**: `apps/frontend-next/src/app/dashboard/quality/page.tsx:11`

```typescript
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/projects/ibks/api`;  // 'ibks' 하드코딩
```

**영향**: 멀티 테넌트 환경에서 동작 안 함

### 3.5 Error Boundary 부재 (Medium)

**영향**: 컴포넌트 에러 발생 시 전체 페이지 흰 화면

### 3.6 setInterval 정리 누락 (12개 이상 컴포넌트)

**파일**:
- `apps/frontend-next/src/app/dashboard/operations/page.tsx:63`
- `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx:49`
- `apps/frontend-next/src/app/dashboard/ai-performance/page.tsx:62`
- `apps/frontend-next/src/app/dashboard/quality/page.tsx:79`
- 기타 다수

```typescript
useEffect(() => {
  const interval = setInterval(fetchData, 5 * 60 * 1000);
  // return () => clearInterval(interval);  ← 누락!
}, []);
```

**영향**: 페이지 이동 후에도 interval 계속 실행, 메모리 누수

### 3.7 Fetch Abort Signal 누락 (Medium)

```typescript
fetch(url)  // AbortController 없음
  .then(...)
  .catch(...)  // 컴포넌트 언마운트 후 setState 시도 → 워닝
```

### 3.8 Promise.all 부분 실패 미처리 (Medium)

**파일**: `apps/frontend-next/src/app/dashboard/admin/batch-analysis/[id]/page.tsx:70-73`

```typescript
const [jobData, resultsData] = await Promise.all([
  batchAnalysisApi.getJob(jobId),
  batchAnalysisApi.listResults(filterParams),
]);  // 하나 실패 시 전체 페이지 에러
```

### 3.9 접근성(A11y) 추가 문제점 (Low)

- FloatingChatbot 버튼 `animate-pulse` → 집중력 방해
- 접히는 섹션에 `aria-expanded` 누락
- 커스텀 인터랙티브 요소에 키보드 포커스 인디케이터 없음

---

## 4. 타입 안전성 문제점

### 4.1 과도한 옵셔널 필드 (High)

**파일**: `packages/shared-types/src/index.ts`

```typescript
export interface B2BLog {
  timestamp: { value: string } | string;  // 유니온 타입 복잡도
  tenant_id?: string;  // 필수여야 함
  success?: boolean;   // 필수여야 함
  ...
}
```

### 4.2 Discriminated Union 미사용 (High)

```typescript
export interface ApiResponse<T> {
  success: boolean;  // 항상 true/false
  data?: T;
  error?: string;
}

// 개선: Discriminated Union
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### 4.3 세션/메시지 타입 제약 부족 (Medium)

**파일**: `packages/shared-types/src/index.ts:414-429`

```typescript
export interface AnalysisMessage {
  role: string;  // 'user' | 'assistant' 리터럴 타입이어야 함
  metadata?: AnalysisMessageMetadata;  // 항상 존재해야 하는 필드가 옵셔널
}
```

### 4.4 TypeScript Strict 플래그 누락 (Medium)

**파일**: `apps/backend/tsconfig.json`, `apps/frontend-next/tsconfig.json`

```json
// 누락된 중요 플래그
"noUncheckedIndexedAccess": true,   // 배열 인덱싱 시 undefined 체크 강제
"exactOptionalPropertyTypes": true   // 옵셔널 속성 정확한 타입 체크
```

**파일**: `apps/frontend-next/tsconfig.json`
```json
"target": "ES2017"  // 너무 오래됨 → ES2020+ 권장
```

---

## 5. Prisma 스키마 문제점

### 5.1 ENUM 대신 STRING 사용 (High)

**파일**: `apps/backend/prisma/schema.prisma`

```prisma
model BatchAnalysisJob {
  status String  // 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' 등
}

model AnalysisMessage {
  role String  // 'user' | 'assistant'
}
```

**문제**: DB 레벨에서 잘못된 값 삽입 방지 불가

### 5.2 JSON을 STRING으로 저장 (High)

```prisma
// 7개 필드에서 발견
criteria     String  // JSON string으로 저장
issues       String  // JSON array as string
improvements String  // JSON array as string
```

**개선**: `@db.Json` 타입 사용 + Prisma JSON 필터링

### 5.3 인덱스 누락 (Medium)

```prisma
// 누락된 인덱스
model AuditLog {
  resourceId String
  // @@index([resourceId]) 누락 - "리소스 X의 모든 변경사항" 쿼리 느림
}

model BatchAnalysisResult {
  // @@index([status, tenantId]) 누락
}
```

### 5.4 Batch Analysis 스키마 설계 문제 (High)

```prisma
model BatchAnalysisResult {
  // BigQuery 원본 데이터 중복 저장
  originalTimestamp DateTime
  userInput         String
  llmResponse       String

  // 점수 필드 전부 nullable
  qualityScore Int?
  relevance    Int?
  completeness Int?
  clarity      Int?
  // avgScore가 NaN이 될 수 있음
}
```

### 5.5 Soft Delete 패턴 불일치 (Low)

- `User.isActive`: 수동 soft delete
- `deletedAt` 타임스탬프 없음 (감사 추적 불가)
- `ApiKey.revokedAt` 존재 → 패턴 불일치

---

## 6. 설정 및 인프라 문제점

### 6.1 TypeScript 버전 불일치 (High)

| 패키지 | 버전 |
|--------|------|
| root | ~5.8.2 |
| backend | ^5.7.3 |
| frontend-next | ^5 (6.x까지 허용) |
| shared-types | ^5.0.0 |

### 6.2 @types/node 불일치 (Medium)

| 패키지 | 버전 |
|--------|------|
| backend | ^22.10.7 |
| frontend-next | ^20 (2 major 버전 차이) |

### 6.3 NestJS 버전 불일치 (Medium)

```json
"@nestjs/common": "^10.0.0",
"@nestjs/cli": "^11.0.0",     // Major 버전 차이!
"@nestjs/testing": "^11.0.1"  // Major 버전 차이!
```

### 6.4 SQLite 경로 설정 문제 (High)

```
DATABASE_URL="file:./prisma/admin.db"  // 상대 경로
```

**문제**: 컨테이너 환경에서 경로 혼란, 백업 전략 없음

### 6.5 환경변수 검증 스키마 없음 (Medium)

- `zod` 또는 `joi` 기반 검증 없음
- 필수 환경변수 누락 시 런타임에서야 발견
- `JWT_SECRET` 강도 검증 없음

### 6.6 Monorepo 스크립트 문제 (Low)

```json
"scripts": {
  "dev": "pnpm --parallel -r dev",  // 모든 워크스페이스에서 실행
}
```

- `postinstall` 훅 없음 (Prisma 클라이언트 자동 생성 안 함)
- `clean` 스크립트 없음
- 전체 레포 `lint`/`format` 없음

---

## 7. 개선 우선순위 추가

### Priority 0: 즉시 수정 (배포 차단)

| 항목 | 작업 | 파일 |
|------|------|------|
| 시크릿 노출 | .env를 .gitignore 추가, 키 재발급 | `.env`, `.gitignore` |
| JSON.parse 크래시 | try-catch 추가 | `batch-analysis/[id]/page.tsx` |
| BigQuery 초기화 | OnModuleInit 사용 | `batch-analysis.service.ts`, `faq-analysis.service.ts` |

### Priority 1.5: 보안/안정성 보강

| 항목 | 작업 | 파일 |
|------|------|------|
| 토큰 갱신 Race | 락 메커니즘 추가 | `api-client.ts` |
| 입력 검증 | 범위 검증 추가 (0 < days <= 365) | `metrics.controller.ts` |
| Promise.all | Promise.allSettled 사용 | `batch-analysis.service.ts` |
| 환경변수 검증 | zod 스키마 추가 | `main.ts` |

### Priority 2.5: 프론트엔드 안정화

| 항목 | 작업 | 파일 |
|------|------|------|
| Error Boundary | 주요 페이지에 추가 | 모든 dashboard 페이지 |
| setInterval 정리 | cleanup 함수 추가 | 12개 이상 컴포넌트 |
| DataTable key | 고유 ID 사용 | `DataTable/index.tsx` |
| AbortController | fetch에 signal 추가 | 모든 API 호출 |

### Priority 3.5: 타입/스키마 개선

| 항목 | 작업 | 파일 |
|------|------|------|
| Prisma ENUM | String → Enum 변경 | `schema.prisma` |
| JSON 타입 | @db.Json 사용 | `schema.prisma` |
| 인덱스 추가 | 누락된 인덱스 추가 | `schema.prisma` |
| TS strict | 누락 플래그 추가 | `tsconfig.json` |
| 버전 고정 | TypeScript/NestJS 버전 통일 | `package.json` |

---

## 8. 수정된 프로덕션 준비도

| 영역 | REVIEW.md | 추가 발견 | 최종 상태 |
|------|-----------|-----------|-----------|
| 로컬 개발 | ✅ | - | ✅ |
| 보안 | ⚠️ | **❌ 시크릿 노출** | ❌ |
| 확장성 | ⚠️ | Race Condition 추가 | ⚠️ |
| 컨테이너화 | ❌ | - | ❌ |
| CI/CD | ❌ | - | ❌ |
| 테스트 | ❌ | - | ❌ |
| 관측성 | ❌ | - | ❌ |
| **타입 안전성** | - | ⚠️ 과도한 옵셔널 | ⚠️ |
| **프론트엔드 안정성** | - | ⚠️ 메모리 누수 | ⚠️ |
| **DB 스키마** | - | ⚠️ ENUM/인덱스 부재 | ⚠️ |
| **설정 일관성** | - | ⚠️ 버전 불일치 | ⚠️ |

---

## 9. 문제점 통계

| 심각도 | 개수 | 주요 항목 |
|--------|------|-----------|
| Critical | 4개 | 시크릿 노출, JSON.parse 크래시, 토큰 갱신 Race, BigQuery 초기화 |
| High | 12개 | Fire-and-Forget Promise, DataTable key, Prisma STRING→ENUM |
| Medium | 18개 | Cache Race, setInterval 누락, Error Boundary |
| Low | 8개 | Rate Limiting 미사용, 에러 메시지 품질 |

---

## 10. 결론

기존 REVIEW.md에서 발견한 문제 외에 **42개의 추가 문제점**이 발견되었습니다.

**최우선 작업**:
1. `.env` 파일의 실제 시크릿 즉시 제거 및 키 재발급
2. 프론트엔드 JSON.parse에 try-catch 추가
3. 백엔드 서비스 async 초기화 패턴 수정 (OnModuleInit 사용)
4. 토큰 갱신 로직 Race Condition 수정

**프로덕션 배포 전 필수**: Priority 0 + Priority 1.5 항목 완료 (약 2-3일 추가 작업)

---

*추가 리뷰 일자: 2026-01-21*
