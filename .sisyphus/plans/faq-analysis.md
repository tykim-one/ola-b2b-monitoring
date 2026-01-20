# FAQ 분석 및 사유 분석 기능 구현 계획

## Context

### Original Request
FAQ(자주 묻는 질문) 분석 및 사유 분석 기능 구현:
- 동일 텍스트 그룹화 + 유사 텍스트 클러스터링
- LLM 기반 사유 분석 (왜 이 질문이 자주 나오는지)
- Quality 대시보드에 새 섹션으로 표시

### Interview Summary
| 항목 | 결정 사항 |
|------|----------|
| 클러스터링 방식 | 하이브리드 (1차: 텍스트 정규화, 2차: LLM 병합) |
| 실행 방식 | 온디맨드 (버튼 클릭) |
| 분석 범위 | 사용자 선택 (기간, Top N) |
| 사유 분석 깊이 | 간단 (한 줄 요약) |
| UI 위치 | Quality 대시보드 내 새 섹션 |

### Research Findings
- 기존 `batch-analysis` 모듈: Gemini API 연동, SQLite 저장 패턴 존재
- 기존 `metrics.queries.ts`: `repeatedQueryPatterns` 쿼리 참고 가능
- BigQuery 스키마: `user_input`, `tenant_id`, `timestamp` 필드 활용

---

## Work Objectives

### Core Objective
사용자 질문 데이터를 분석하여 FAQ를 자동 식별하고, LLM을 통해 해당 질문이 자주 발생하는 근본 원인을 분석하여 챗봇 개선에 활용할 수 있는 인사이트를 제공한다.

### Deliverables
1. **백엔드 API**: FAQ 분석 실행 및 결과 조회 엔드포인트
2. **FAQ 클러스터링 서비스**: 텍스트 정규화 + LLM 기반 유사 그룹 병합
3. **사유 분석 서비스**: Gemini API를 통한 원인 분석
4. **프론트엔드 UI**: Quality 페이지 내 FAQ 분석 섹션

### Definition of Done
- [ ] FAQ 분석 API가 정상 동작 (200 응답)
- [ ] 텍스트 정규화로 동일 질문 그룹화됨
- [ ] LLM이 유사 그룹을 병합함
- [ ] 각 FAQ 그룹에 사유 분석 결과가 포함됨
- [ ] Quality 대시보드에서 결과 확인 가능
- [ ] LLM 실패 시 1차 그룹만 반환 (graceful degradation)

---

## Guardrails

### Must Have
- 기간 선택 (7일, 14일, 30일)
- Top N 선택 (10, 20, 50)
- 테넌트 필터
- 로딩 상태 표시
- 에러 핸들링 (LLM 실패 시 fallback)

### Must NOT Have
- 실시간 스트리밍 분석 (온디맨드 배치로 충분)
- 복잡한 차트 시각화 (텍스트 기반 분석)
- 분석 결과 영구 저장 (캐시 없이 매번 새로 실행)
- 별도 페이지 라우트 추가

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Action                                    │
│                    (Quality 페이지에서 "분석 실행" 클릭)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ FAQAnalysis     │───▶│ faqAnalysis     │───▶│ api-client.ts   │     │
│  │ Section.tsx     │    │ Service.ts      │    │ POST /analyze   │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend (NestJS)                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ FAQAnalysis     │───▶│ FAQAnalysis     │───▶│ FAQClustering   │     │
│  │ Controller      │    │ Service         │    │ Service         │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                │                        │               │
│                                ▼                        ▼               │
│                    ┌─────────────────┐    ┌─────────────────┐          │
│                    │ ReasonAnalysis  │    │ BigQuery        │          │
│                    │ Service         │    │ DataSource      │          │
│                    └─────────────────┘    └─────────────────┘          │
│                                │                                        │
│                                ▼                                        │
│                    ┌─────────────────┐                                  │
│                    │ Gemini API      │                                  │
│                    │ (gemini-flash)  │                                  │
│                    └─────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Processing Pipeline

```
Step 1: BigQuery에서 user_input 추출 (기간/테넌트 필터)
           │
           ▼
Step 2: 텍스트 정규화 (공백, 특수문자, 대소문자 통일)
           │
           ▼
Step 3: 동일 정규화 텍스트 그룹화 (Map<normalizedText, questions[]>)
           │
           ▼
Step 4: 빈도순 정렬 후 Top N 추출
           │
           ▼
Step 5: LLM 클러스터링 (유사 그룹 병합) - 실패 시 Step 4 결과 반환
           │
           ▼
Step 6: 각 클러스터별 LLM 사유 분석
           │
           ▼
Step 7: 최종 결과 반환
```

---

## Backend Design

### API Endpoints

#### POST /api/quality/faq-analysis
FAQ 분석 실행 (온디맨드)

**Request Body:**
```typescript
interface FAQAnalysisRequest {
  tenantId?: string;       // 선택: 특정 테넌트만 분석
  periodDays: number;      // 7 | 14 | 30
  topN: number;            // 10 | 20 | 50
}
```

**Response:**
```typescript
interface FAQAnalysisResponse {
  analyzedAt: string;      // ISO timestamp
  totalQuestions: number;  // 분석된 총 질문 수
  period: {
    start: string;
    end: string;
  };
  clusters: FAQCluster[];
}

interface FAQCluster {
  id: string;                    // 클러스터 ID
  representativeQuestion: string; // 대표 질문
  frequency: number;              // 총 빈도
  questions: {                    // 포함된 질문들
    text: string;
    count: number;
    tenantId: string;
  }[];
  reasonAnalysis: string;         // LLM 사유 분석 (한 줄)
  isMerged: boolean;              // LLM 병합 여부
}
```

### Service Structure

```
apps/backend/src/faq-analysis/
├── faq-analysis.module.ts
├── faq-analysis.controller.ts
├── faq-analysis.service.ts          # 메인 오케스트레이터
├── services/
│   ├── faq-clustering.service.ts    # 텍스트 정규화 + 그룹화
│   └── reason-analysis.service.ts   # LLM 사유 분석
├── dto/
│   ├── faq-analysis-request.dto.ts
│   └── faq-analysis-response.dto.ts
└── interfaces/
    └── faq-cluster.interface.ts
```

### Key Service Methods

#### FAQClusteringService

```typescript
class FAQClusteringService {
  // 1차: 텍스트 정규화 그룹화
  groupByNormalization(questions: RawQuestion[]): NormalizedGroup[];

  // 2차: LLM 유사 그룹 병합
  async mergeWithLLM(groups: NormalizedGroup[]): Promise<MergedCluster[]>;

  // 텍스트 정규화 헬퍼
  private normalizeText(text: string): string;
}
```

#### ReasonAnalysisService

```typescript
class ReasonAnalysisService {
  // 클러스터별 사유 분석
  async analyzeReason(cluster: MergedCluster): Promise<string>;

  // 배치 분석 (여러 클러스터 한번에)
  async analyzeReasonsBatch(clusters: MergedCluster[]): Promise<Map<string, string>>;
}
```

### LLM Prompts

#### 유사 그룹 병합 프롬프트

```
다음은 사용자들이 자주 묻는 질문 그룹 목록입니다.
의미적으로 유사한 그룹들을 병합해주세요.

질문 그룹:
1. "배송 언제 오나요?" (빈도: 45)
2. "배송 조회 어떻게 해요?" (빈도: 32)
3. "주문 취소 방법" (빈도: 28)
...

응답 형식 (JSON):
{
  "mergedGroups": [
    {
      "representativeQuestion": "배송 관련 문의",
      "mergedIds": [1, 2],
      "reason": "배송 상태 및 조회 관련 유사 질문"
    },
    ...
  ],
  "unmergedIds": [3, ...]
}
```

#### 사유 분석 프롬프트

```
다음 FAQ 질문에 대해 사용자들이 이 질문을 자주 하는 근본 원인을 한 줄로 분석해주세요.

질문: "{representativeQuestion}"
빈도: {frequency}회
포함된 유사 질문들: {questions}

응답 형식: 원인을 50자 이내의 한 줄로 작성
예시: "배송 상태 페이지 접근성 부족으로 인한 반복 문의"
```

### BigQuery Query

```sql
-- FAQ 분석용 질문 추출
SELECT
  user_input,
  tenant_id,
  COUNT(*) as count
FROM `{dataset}.{table}`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @periodDays DAY)
  AND user_input IS NOT NULL
  AND TRIM(user_input) != ''
  {tenantFilter}
GROUP BY user_input, tenant_id
ORDER BY count DESC
LIMIT 1000  -- 샘플링: 상위 1000개만 분석
```

---

## Frontend Design

### Component Structure

```
apps/frontend-next/src/
├── app/dashboard/quality/
│   └── page.tsx                    # FAQ 섹션 추가
├── components/
│   └── faq-analysis/
│       ├── FAQAnalysisSection.tsx  # 메인 섹션 컨테이너
│       ├── FAQAnalysisForm.tsx     # 필터 폼 (기간, Top N)
│       ├── FAQClusterList.tsx      # 클러스터 목록
│       └── FAQClusterCard.tsx      # 개별 클러스터 카드
└── services/
    └── faqAnalysisService.ts       # API 호출 서비스
```

### UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Quality Dashboard                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [기존 품질 분석 섹션들...]                                        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ FAQ 분석 (자주 묻는 질문)                                     ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                              ││
│  │  기간: [7일 ▼]  Top: [10개 ▼]  테넌트: [전체 ▼]  [분석 실행]  ││
│  │                                                              ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                              ││
│  │  분석 결과 (2024-01-15 14:30 기준, 총 2,345건 분석)           ││
│  │                                                              ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │ #1  배송 관련 문의                           빈도: 127회 │││
│  │  │ ─────────────────────────────────────────────────────── │││
│  │  │ 포함 질문:                                              │││
│  │  │   • "배송 언제 오나요?" (45회)                           │││
│  │  │   • "배송 조회 어떻게 해요?" (32회)                       │││
│  │  │   • "배송 상태 확인" (28회)                              │││
│  │  │   • 외 3개...                                           │││
│  │  │ ─────────────────────────────────────────────────────── │││
│  │  │ 사유 분석: 배송 상태 페이지 접근성 부족으로 인한 반복 문의   │││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                                                              ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │ #2  결제 수단 문의                           빈도: 89회  │││
│  │  │ ...                                                     │││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Specifications

#### FAQAnalysisSection.tsx
```typescript
interface FAQAnalysisSectionProps {
  projectId: string;
}

// 상태 관리
- isLoading: boolean
- error: string | null
- result: FAQAnalysisResponse | null
- filters: { periodDays, topN, tenantId }
```

#### FAQClusterCard.tsx
```typescript
interface FAQClusterCardProps {
  cluster: FAQCluster;
  rank: number;
}

// 표시 요소
- 순위 뱃지
- 대표 질문 (굵게)
- 빈도 수
- 포함된 질문 목록 (접기/펼치기)
- 사유 분석 결과 (하이라이트)
- LLM 병합 여부 아이콘
```

---

## Implementation Tasks

### Phase 1: Backend Foundation (Day 1)

- [ ] **1.1** `faq-analysis` 모듈 생성 및 구조 세팅
  - `faq-analysis.module.ts`, `controller.ts`, `service.ts` 생성
  - DTO 정의 (`faq-analysis-request.dto.ts`, `faq-analysis-response.dto.ts`)
  - 인터페이스 정의 (`faq-cluster.interface.ts`)

- [ ] **1.2** BigQuery 쿼리 구현
  - `metrics.queries.ts`에 `faqQuestions` 쿼리 추가
  - 기간/테넌트 필터링 지원
  - 샘플링 로직 (상위 1000개)

- [ ] **1.3** FAQClusteringService 구현
  - `normalizeText()` 메서드 (공백, 특수문자, 대소문자 정규화)
  - `groupByNormalization()` 메서드
  - 단위 테스트 작성

### Phase 2: LLM Integration (Day 2)

- [ ] **2.1** LLM 클러스터링 구현
  - `mergeWithLLM()` 메서드
  - 프롬프트 템플릿 정의
  - JSON 파싱 및 에러 핸들링
  - Fallback 로직 (LLM 실패 시 1차 그룹 반환)

- [ ] **2.2** ReasonAnalysisService 구현
  - `analyzeReason()` 단일 분석
  - `analyzeReasonsBatch()` 배치 분석
  - 프롬프트 템플릿 정의

- [ ] **2.3** FAQAnalysisService 통합
  - 전체 파이프라인 오케스트레이션
  - 에러 핸들링 및 로깅

### Phase 3: API & Integration (Day 3)

- [ ] **3.1** Controller 구현
  - `POST /api/quality/faq-analysis` 엔드포인트
  - Request validation (class-validator)
  - 권한 검사 (기존 quality 권한 활용)

- [ ] **3.2** AppModule 통합
  - FAQAnalysisModule import
  - 환경변수 확인

- [ ] **3.3** API 테스트
  - E2E 테스트 작성
  - 수동 테스트 (Postman/curl)

### Phase 4: Frontend Implementation (Day 4)

- [ ] **4.1** 서비스 레이어
  - `faqAnalysisService.ts` 생성
  - API 호출 함수 구현
  - 타입 정의

- [ ] **4.2** 컴포넌트 구현
  - `FAQAnalysisSection.tsx` - 메인 컨테이너
  - `FAQAnalysisForm.tsx` - 필터 폼
  - `FAQClusterList.tsx` - 목록 렌더링
  - `FAQClusterCard.tsx` - 개별 카드

- [ ] **4.3** Quality 페이지 통합
  - `page.tsx`에 FAQAnalysisSection 추가
  - 스타일링 (기존 테마 일관성)

### Phase 5: Polish & Testing (Day 5)

- [ ] **5.1** 에러 상태 UI
  - 로딩 스피너
  - 에러 메시지 표시
  - 빈 결과 상태

- [ ] **5.2** UX 개선
  - 질문 목록 접기/펼치기
  - 분석 중 버튼 비활성화
  - 결과 타임스탬프 표시

- [ ] **5.3** 통합 테스트
  - 전체 플로우 테스트
  - 엣지 케이스 확인 (데이터 없음, LLM 실패 등)

---

## Commit Strategy

```
feat(faq-analysis): add module structure and DTOs
feat(faq-analysis): implement BigQuery query for FAQ extraction
feat(faq-analysis): implement text normalization clustering
feat(faq-analysis): integrate LLM for cluster merging
feat(faq-analysis): add reason analysis service
feat(faq-analysis): implement API endpoint
feat(frontend): add FAQ analysis service
feat(frontend): implement FAQ analysis components
feat(frontend): integrate FAQ section into quality dashboard
test(faq-analysis): add unit and e2e tests
```

---

## Success Criteria

### Functional
- [ ] 7일/14일/30일 기간 선택 동작
- [ ] Top 10/20/50 선택 동작
- [ ] 테넌트 필터 동작
- [ ] 분석 실행 후 결과 표시
- [ ] 사유 분석 결과가 각 클러스터에 포함

### Non-Functional
- [ ] 분석 완료 시간 < 30초 (일반적인 데이터량)
- [ ] LLM 실패 시 graceful degradation
- [ ] 기존 Quality 페이지 스타일과 일관성

### Edge Cases
- [ ] 데이터 없음: "분석할 데이터가 없습니다" 메시지
- [ ] LLM 타임아웃: 1차 그룹 결과만 반환 + 경고 메시지
- [ ] 단일 질문만 있음: 클러스터링 없이 그대로 표시

---

## Verification Plan

### Unit Tests
- `FAQClusteringService.normalizeText()` - 정규화 케이스들
- `FAQClusteringService.groupByNormalization()` - 그룹화 로직
- JSON 파싱 에러 핸들링

### Integration Tests
- BigQuery 쿼리 실행 확인
- LLM API 호출 및 응답 파싱
- 전체 파이프라인 (E2E)

### Manual Tests
1. Quality 페이지 접속
2. 필터 설정 (7일, Top 10)
3. "분석 실행" 클릭
4. 로딩 상태 확인
5. 결과 표시 확인
6. 클러스터 카드 내용 검증
7. 사유 분석 결과 확인

---

## Next Steps

계획 검토 후 구현을 시작하려면:

```bash
# 작업 시작
# (Sisyphus 모드에서 이 계획 파일 경로 전달)
```

또는 `/review` 명령으로 Momus에게 계획 검토를 요청할 수 있습니다.
