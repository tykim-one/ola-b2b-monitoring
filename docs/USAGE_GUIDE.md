# 사용 가이드

## 1. 시작하기

### 1.1 사전 요구사항

- Node.js 18+
- pnpm 8+
- GCP 서비스 계정 (BigQuery 접근 권한)

### 1.2 설치

```bash
# 저장소 클론
git clone <repository-url>
cd ola-b2b-monitoring

# 의존성 설치
pnpm install

# 환경 변수 설정
cp apps/backend/.env.example apps/backend/.env
```

### 1.3 환경 변수 설정

```env
# apps/backend/.env

# GCP 설정
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=your-gcp-project

# BigQuery 설정
BIGQUERY_DATASET=your_dataset
BIGQUERY_TABLE=your_logs_table

# 서버 설정
PORT=3000
```

### 1.4 실행

```bash
# 전체 실행 (백엔드 + 프론트엔드)
pnpm dev:all

# 개별 실행
pnpm dev:backend   # http://localhost:3000
pnpm dev:frontend  # http://localhost:3001
```

---

## 2. 대시보드 사용법

### 2.1 운영 모니터링 (`/dashboard/operations`)

**목적:** 실시간 시스템 상태 모니터링

**주요 지표:**
| 지표 | 설명 | 정상 범위 |
|------|------|-----------|
| 총 요청 | 24시간 내 총 API 요청 수 | - |
| 성공률 | 성공한 요청 비율 | > 95% |
| 에러율 | 실패한 요청 비율 | < 5% |
| 활성 테넌트 | 현재 활동 중인 테넌트 수 | - |

**알림 기준:**
- 에러율 > 5%: 노란색 경고
- 에러율 > 10%: 빨간색 위험

### 2.2 비즈니스 분석 (`/dashboard/business`)

**목적:** 테넌트별 사용량 및 비용 분석

**차트 설명:**

1. **테넌트별 사용량 (파이 차트)**
   - 각 테넌트의 토큰/요청 비율 확인
   - 주요 사용자 식별

2. **비용 트렌드 (복합 차트)**
   - 일별 Input/Output 비용 추이
   - 비용 증가 패턴 파악

3. **사용량 히트맵**
   - 요일/시간대별 트래픽 패턴
   - 피크 시간대 식별

### 2.3 AI 성능 분석 (`/dashboard/ai-performance`)

**목적:** LLM 토큰 효율성 및 이상 탐지

**분석 내용:**

1. **토큰 효율성 산점도**
   - X축: Input 토큰
   - Y축: Output 토큰
   - 효율적인 테넌트 식별

2. **이상 탐지 알림**
   - 토큰 사용량 급증
   - 에러율 이상
   - 트래픽 스파이크

---

## 3. API 사용법

### 3.1 Swagger 문서

백엔드 실행 후 접속: http://localhost:3000/api

### 3.2 주요 API 예시

**실시간 KPI 조회:**
```bash
curl http://localhost:3000/projects/ibks/metrics/realtime
```

**응답:**
```json
{
  "success": true,
  "data": {
    "total_requests": 12345,
    "success_count": 12000,
    "fail_count": 345,
    "error_rate": 2.8,
    "total_tokens": 5678900,
    "avg_tokens": 460,
    "active_tenants": 15
  },
  "cached": true,
  "cacheTTL": "5분"
}
```

**테넌트별 사용량 조회:**
```bash
curl http://localhost:3000/projects/ibks/analytics/tenant-usage
```

**이상 탐지 결과 조회:**
```bash
curl http://localhost:3000/ml/anomalies/ibks
```

### 3.3 캐시 관리

**캐시 통계 확인:**
```bash
curl http://localhost:3000/cache/stats
```

**캐시 초기화:**
```bash
curl -X DELETE http://localhost:3000/cache/flush
```

---

## 4. BigQuery 설정

### 4.1 Materialized View 생성 (권장)

성능 향상을 위해 BigQuery에 Materialized View를 생성합니다.

**시간별 메트릭 뷰:**
```sql
CREATE MATERIALIZED VIEW `project.dataset.hourly_metrics`
OPTIONS (enable_refresh = true, refresh_interval_minutes = 60)
AS
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
  JSON_EXTRACT_SCALAR(jsonPayload, '$.tenant_id') as tenant_id,
  COUNT(*) as request_count,
  COUNTIF(JSON_EXTRACT_SCALAR(jsonPayload, '$.success') = 'true') as success_count,
  COUNTIF(JSON_EXTRACT_SCALAR(jsonPayload, '$.success') = 'false') as fail_count,
  SUM(CAST(JSON_EXTRACT_SCALAR(jsonPayload, '$.total_tokens') AS INT64)) as total_tokens,
  AVG(CAST(JSON_EXTRACT_SCALAR(jsonPayload, '$.total_tokens') AS INT64)) as avg_tokens
FROM `project.dataset.logs`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY hour, tenant_id;
```

**일별 테넌트 뷰:**
```sql
CREATE MATERIALIZED VIEW `project.dataset.daily_tenant_metrics`
OPTIONS (enable_refresh = true, refresh_interval_minutes = 360)
AS
SELECT
  DATE(timestamp) as date,
  JSON_EXTRACT_SCALAR(jsonPayload, '$.tenant_id') as tenant_id,
  COUNT(*) as request_count,
  SUM(CAST(JSON_EXTRACT_SCALAR(jsonPayload, '$.total_tokens') AS INT64)) as total_tokens
FROM `project.dataset.logs`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
GROUP BY date, tenant_id;
```

### 4.2 로그 데이터 형식

시스템에서 기대하는 BigQuery 로그 형식:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "jsonPayload": {
    "tenant_id": "tenant-001",
    "user_input": "사용자 질문",
    "llm_response": "AI 응답",
    "success": "true",
    "fail_reason": null,
    "input_tokens": 150,
    "output_tokens": 350,
    "total_tokens": 500,
    "request_metadata": {
      "session_id": "sess-123"
    }
  }
}
```

---

## 5. 문제 해결

### 5.1 빌드 오류

**TypeScript 오류:**
```bash
# 타입 재생성
pnpm build:shared-types

# 전체 재빌드
pnpm clean && pnpm install && pnpm build
```

**의존성 오류:**
```bash
# 캐시 정리 후 재설치
rm -rf node_modules
rm -rf apps/*/node_modules
pnpm install
```

### 5.2 BigQuery 연결 오류

**인증 오류:**
```bash
# 서비스 계정 키 확인
cat $GOOGLE_APPLICATION_CREDENTIALS

# 권한 확인 (BigQuery Data Viewer, BigQuery Job User 필요)
gcloud projects get-iam-policy $GCP_PROJECT_ID
```

**쿼리 오류:**
- 데이터셋/테이블 이름 확인
- jsonPayload 필드 구조 확인
- 타임스탬프 형식 확인

### 5.3 캐시 문제

**오래된 데이터 표시:**
```bash
# 캐시 초기화
curl -X DELETE http://localhost:3000/cache/flush
```

**메모리 사용량 증가:**
- `cache.service.ts`에서 TTL 조정
- 캐시 키 수 제한 설정

### 5.4 차트 렌더링 문제

**빈 차트 표시:**
- 데이터 형식 확인
- 컨테이너 크기 확인 (width/height > 0)
- 브라우저 콘솔 에러 확인

**반응형 문제:**
- `ResponsiveContainer` 사용 확인
- 부모 요소에 명시적 크기 설정

---

## 6. 운영 팁

### 6.1 성능 최적화

1. **캐시 TTL 조정**
   - 실시간성이 덜 중요한 데이터: TTL 증가
   - 빠른 갱신이 필요한 데이터: TTL 감소

2. **BigQuery 쿼리 최적화**
   - Materialized View 활용
   - 파티셔닝/클러스터링 적용
   - 필요한 컬럼만 SELECT

3. **프론트엔드 최적화**
   - 데이터 페칭 주기 조정
   - 차트 리렌더링 최소화

### 6.2 모니터링

1. **캐시 히트율 확인**
   ```bash
   curl http://localhost:3000/cache/stats
   ```
   - hitRate > 80% 권장

2. **API 응답 시간 확인**
   - 캐시 히트: < 10ms
   - 캐시 미스: BigQuery 쿼리 시간

3. **에러 로그 확인**
   ```bash
   tail -f apps/backend/logs/error.log
   ```

### 6.3 백업 및 복구

1. **설정 백업**
   - `.env` 파일 안전하게 보관
   - BigQuery Materialized View DDL 보관

2. **데이터는 BigQuery에 보관**
   - 캐시는 휘발성이므로 백업 불필요
   - 재시작 시 자동으로 캐시 재구축
