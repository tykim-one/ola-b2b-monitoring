# PostgreSQL ETL 모니터링 시스템 구현 진행 현황

> **마지막 업데이트**: 2026-01-21
> **상태**: ✅ 구현 완료

---

## 개요

2개의 독립적인 ETL 모니터링 모듈을 구현 완료했습니다.

| 프로젝트 | 테이블 | 도메인 | 진행 상태 |
|----------|--------|--------|-----------|
| Wind ETL | `ops.cn_wind_etl_runs` | 파일 처리 ETL | ✅ 완료 |
| Minkabu ETL | `ops.jp_minkabu_etl_runs` | 뉴스 크롤링 ETL | ✅ 완료 |

---

## 진행 현황

### Phase 1: Wind ETL 모니터링 모듈 ✅ 완료

| 단계 | 파일 | 상태 |
|------|------|------|
| DTO 정의 | `src/wind-etl/dto/wind-etl.dto.ts` | ✅ 완료 |
| DataSource 구현 | `src/wind-etl/wind-etl.datasource.ts` | ✅ 완료 |
| Service 구현 | `src/wind-etl/wind-etl.service.ts` | ✅ 완료 |
| Controller 구현 | `src/wind-etl/wind-etl.controller.ts` | ✅ 완료 |
| Module 등록 | `src/wind-etl/wind-etl.module.ts` | ✅ 완료 |

### Phase 2: Minkabu ETL 모니터링 모듈 ✅ 완료

| 단계 | 파일 | 상태 |
|------|------|------|
| DTO 정의 | `src/minkabu-etl/dto/minkabu-etl.dto.ts` | ✅ 완료 |
| DataSource 구현 | `src/minkabu-etl/minkabu-etl.datasource.ts` | ✅ 완료 |
| Service 구현 | `src/minkabu-etl/minkabu-etl.service.ts` | ✅ 완료 |
| Controller 구현 | `src/minkabu-etl/minkabu-etl.controller.ts` | ✅ 완료 |
| Module 등록 | `src/minkabu-etl/minkabu-etl.module.ts` | ✅ 완료 |

### Phase 3: 통합 ✅ 완료

| 단계 | 파일 | 상태 |
|------|------|------|
| App Module 등록 (Wind ETL) | `src/app.module.ts` | ✅ 완료 |
| App Module 등록 (Minkabu ETL) | `src/app.module.ts` | ✅ 완료 |
| 환경변수 추가 | `.env` | ⚠️ 설정 필요 |
| 빌드 및 검증 | - | ✅ 완료 |

---

## 완료된 파일 목록

```
apps/backend/src/wind-etl/
├── dto/
│   └── wind-etl.dto.ts          ✅ 완료
├── wind-etl.datasource.ts       ✅ 완료
├── wind-etl.service.ts          ✅ 완료
├── wind-etl.controller.ts       ✅ 완료
└── wind-etl.module.ts           ✅ 완료

apps/backend/src/minkabu-etl/
├── dto/
│   └── minkabu-etl.dto.ts       ✅ 완료
├── minkabu-etl.datasource.ts    ✅ 완료
├── minkabu-etl.service.ts       ✅ 완료
├── minkabu-etl.controller.ts    ✅ 완료
└── minkabu-etl.module.ts        ✅ 완료
```

---

## API 엔드포인트

### Wind ETL (`/api/wind-etl/*`)

| 메서드 | 엔드포인트 | 설명 | 캐시 TTL |
|--------|-----------|------|----------|
| GET | `/health` | PostgreSQL 연결 상태 확인 | - |
| GET | `/runs` | 최근 ETL 실행 목록 | 5분 |
| GET | `/summary` | 실행 현황 요약 | 5분 |
| GET | `/trend/daily` | 일별 트렌드 | 15분 |
| GET | `/trend/hourly` | 시간별 트렌드 | 5분 |
| GET | `/errors` | 에러 분석 | 5분 |
| GET | `/stats/files` | 파일 처리 통계 | 15분 |
| GET | `/stats/records` | 레코드 처리 통계 | 15분 |

### Minkabu ETL (`/api/minkabu-etl/*`)

| 메서드 | 엔드포인트 | 설명 | 캐시 TTL |
|--------|-----------|------|----------|
| GET | `/health` | PostgreSQL 연결 상태 확인 | - |
| GET | `/runs` | 최근 ETL 실행 목록 | 5분 |
| GET | `/summary` | 실행 현황 요약 | 5분 |
| GET | `/trend/daily` | 일별 트렌드 | 15분 |
| GET | `/trend/hourly` | 시간별 트렌드 | 5분 |
| GET | `/errors` | 에러 분석 | 5분 |
| GET | `/stats/headlines` | 헤드라인 수집 통계 | 15분 |
| GET | `/stats/index` | 인덱스 통계 | 15분 |

---

## 테이블 스키마 참고

### cn_wind_etl_runs (Wind ETL)
```sql
CREATE TABLE ops.cn_wind_etl_runs (
  id bigserial PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  status varchar(20) NOT NULL,
  files_found int4 DEFAULT 0,
  files_processed int4 DEFAULT 0,
  files_skipped int4 DEFAULT 0,
  files_moved int4 DEFAULT 0,
  records_inserted int4 DEFAULT 0,
  records_updated int4 DEFAULT 0,
  total_records int4 DEFAULT 0,
  error_count int4 DEFAULT 0,
  errors _text,
  duration_ms int4
);
```

### jp_minkabu_etl_runs (Minkabu ETL)
```sql
CREATE TABLE ops.jp_minkabu_etl_runs (
  id bigserial PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  status varchar(20) NOT NULL,
  index_count int4,
  today_headlines int4,
  yesterday_headlines int4,
  articles_fetched int4,
  error_count int4 DEFAULT 0,
  errors _text,
  duration_ms int4
);
```

---

## 환경변수 (설정 필요)

`.env` 파일에 다음 환경변수를 추가하세요:

```env
# Wind ETL PostgreSQL
WIND_PG_HOST=your_host
WIND_PG_PORT=5432
WIND_PG_DATABASE=your_db
WIND_PG_USER=your_user
WIND_PG_PASSWORD=your_password

# Minkabu ETL PostgreSQL
MINKABU_PG_HOST=your_host
MINKABU_PG_PORT=5432
MINKABU_PG_DATABASE=your_db
MINKABU_PG_USER=your_user
MINKABU_PG_PASSWORD=your_password
```

---

## 사용 예시

### Wind ETL API 호출

```bash
# 헬스 체크
curl http://localhost:3000/api/wind-etl/health

# 최근 실행 목록 (최대 20개)
curl "http://localhost:3000/api/wind-etl/runs?limit=20"

# 7일 요약 통계
curl "http://localhost:3000/api/wind-etl/summary?days=7"

# 30일 일별 트렌드
curl "http://localhost:3000/api/wind-etl/trend/daily?days=30"
```

### Minkabu ETL API 호출

```bash
# 헬스 체크
curl http://localhost:3000/api/minkabu-etl/health

# 최근 실행 목록
curl "http://localhost:3000/api/minkabu-etl/runs?limit=20"

# 헤드라인 수집 통계
curl "http://localhost:3000/api/minkabu-etl/stats/headlines?days=30"
```

---

## 아키텍처 노트

### 3-Layer DataSource 패턴

```
Controller (wind-etl.controller.ts)
    ↓ calls
Service (wind-etl.service.ts) — 캐싱 래퍼
    ↓ delegates to
DataSource (wind-etl.datasource.ts) — PostgreSQL 쿼리 실행
```

### 특징

- **인증 우회**: `@Public()` 데코레이터로 인증 없이 접근 가능 (운영 모니터링 용도)
- **캐싱 전략**: CacheService를 통해 5분/15분 TTL 캐싱 적용
- **연결 풀링**: pg Pool을 사용하여 최대 10개 연결 관리
- **Swagger 문서화**: 모든 API에 Swagger 데코레이터 적용
