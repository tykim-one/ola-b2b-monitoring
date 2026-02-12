# 알림 스케줄 통합 관리 시스템

## 목표
모든 알림 모듈(Job Monitoring, Report Monitoring, UI Check)의 실행 스케줄을 DB에 저장하고, 통합 관리 페이지에서 유저가 자유롭게 변경할 수 있도록 한다.

## 현황 분석

| 모듈 | 현재 방식 | 변경 필요 |
|------|-----------|-----------|
| **Batch Analysis** | DB + API + UI (완성) | 통합 페이지에서 읽기 연동만 |
| **Job Monitoring** | `@Cron('*/10 * * * *')` 하드코딩 | ✅ DB + SchedulerRegistry 전환 |
| **Report Monitoring** | 환경변수 `REPORT_MONITOR_CRON` | ✅ DB + SchedulerRegistry 유지 (소스 변경) |
| **UI Check** | 환경변수 `UI_CHECK_CRON` | ✅ DB + SchedulerRegistry 유지 (소스 변경) |

**핵심 참고 패턴**: `batch-analysis.scheduler.ts` — DB에서 cron 로드 → `SchedulerRegistry.addCronJob()` → CRUD 시 `reloadSchedule()`

---

## Phase 1: Backend — DB 스키마 + CRUD 서비스

### 1-1. Prisma 스키마에 `AlarmSchedule` 모델 추가

**파일**: `apps/backend/prisma/schema.prisma`

```prisma
model AlarmSchedule {
  id              Int      @id @default(autoincrement())
  module          String   // 'job-monitoring' | 'report-monitoring' | 'ui-check'
  name            String   // 사용자에게 보여줄 이름 (예: 'Job 실패 알림')
  cronExpression  String   // cron 표현식 (예: '*/10 * * * *')
  timezone        String   @default("Asia/Seoul")
  isEnabled       Boolean  @default(true)
  description     String?  // 설명
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([module])       // 모듈당 하나의 스케줄 (1:1)
}
```

> **설계 결정**: 모듈당 1개 스케줄 (`@@unique([module])`). Batch Analysis처럼 다중 스케줄이 필요하지 않음. 단순한 "이 알림은 몇 분 간격으로 실행" 수준.

### 1-2. 시드 데이터 — 기본 스케줄 3개

**파일**: `apps/backend/prisma/seed.ts` (기존 시드에 추가)

```
job-monitoring     | '*/10 * * * *' | Job 실패 알림 (10분 주기)
report-monitoring  | '0 8 * * *'    | 리포트 데이터 품질 체크 (매일 08:00)
ui-check           | '30 8 * * *'   | UI 렌더링 체크 (매일 08:30)
```

### 1-3. Alarm Schedule 서비스 + 컨트롤러

**새 모듈**: `apps/backend/src/alarm-schedule/`

```
alarm-schedule/
├── alarm-schedule.module.ts
├── alarm-schedule.controller.ts    # REST API
├── alarm-schedule.service.ts       # CRUD + SchedulerRegistry 연동
└── dto/
    └── alarm-schedule.dto.ts       # DTO 정의
```

**API 엔드포인트**:
- `GET  /api/admin/alarm-schedules` — 전체 목록 조회
- `GET  /api/admin/alarm-schedules/:module` — 모듈별 조회
- `PATCH /api/admin/alarm-schedules/:id` — 스케줄 수정 (cronExpression, timezone, isEnabled)
- `POST /api/admin/alarm-schedules/:id/toggle` — 활성/비활성 토글

**핵심 로직** (`AlarmScheduleService`):
1. `onModuleInit()` — DB에서 스케줄 로드 → 각 모듈의 cron job 등록
2. `updateSchedule(id, dto)` — DB 업데이트 → `reloadCronJob(module)` 호출
3. `reloadCronJob(module)` — SchedulerRegistry에서 기존 job 삭제 → 새 cron 등록
4. 각 모듈의 실행 콜백은 해당 모듈의 서비스 메서드를 호출

---

## Phase 2: Backend — 기존 모듈 스케줄러 리팩터링

### 2-1. Job Monitoring: `@Cron` 데코레이터 제거

**파일**: `apps/backend/src/job-monitoring/job-monitoring.service.ts`

- `@Cron('*/10 * * * *')` 데코레이터 제거
- `checkAndAlertFailedJobs()` 메서드는 유지 (public으로 변경)
- `AlarmScheduleService`가 SchedulerRegistry를 통해 이 메서드를 호출

### 2-2. Report Monitoring: 환경변수 → DB 로드

**파일**: `apps/backend/src/report-monitoring/report-monitoring.scheduler.ts`

- `configService.get('REPORT_MONITOR_CRON')` 호출 제거
- 대신 `AlarmScheduleService`가 DB에서 cron 로드 후 직접 등록
- 기존 `runScheduledCheck()` 메서드는 유지 (public으로 변경)

### 2-3. UI Check: 환경변수 → DB 로드

**파일**: `apps/backend/src/report-monitoring/ui-check.scheduler.ts`

- `configService.get('UI_CHECK_CRON')` 호출 제거
- 동일하게 `AlarmScheduleService`에서 관리
- 기존 `runScheduledCheck()` 메서드는 유지

### 2-4. 모듈 의존성 업데이트

**파일**: `apps/backend/src/app.module.ts`
- `AlarmScheduleModule` import 추가
- `AlarmScheduleModule`이 `JobMonitoringModule`, `ReportMonitoringModule` 의존

---

## Phase 3: Frontend — 통합 관리 페이지

### 3-1. API 서비스 + React Query 훅

**새 파일**: `apps/frontend-next/src/services/alarmScheduleService.ts`
```typescript
// GET /api/admin/alarm-schedules
// PATCH /api/admin/alarm-schedules/:id
// POST /api/admin/alarm-schedules/:id/toggle
```

**새 파일**: `apps/frontend-next/src/hooks/queries/use-alarm-schedules.ts`
```typescript
useAlarmSchedules()       // 전체 목록
useUpdateAlarmSchedule()  // 수정 mutation
useToggleAlarmSchedule()  // 토글 mutation
```

### 3-2. 통합 관리 페이지

**새 파일**: `apps/frontend-next/src/app/dashboard/admin/alarm-schedules/page.tsx`

**UI 구성**:
```
┌──────────────────────────────────────────────┐
│  🔔 알림 스케줄 관리                           │
├──────────────────────────────────────────────┤
│                                               │
│  ┌─ DataTable ─────────────────────────────┐ │
│  │ 모듈          | 스케줄     | 상태 | 액션  │ │
│  │───────────────┼──────────┼─────┼──────│ │
│  │ Job 실패 알림  | */10 * * | ✅  | 수정  │ │
│  │ 리포트 품질    | 0 8 * *  | ✅  | 수정  │ │
│  │ UI 렌더링     | 30 8 * * | ✅  | 수정  │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─ Batch Analysis 스케줄 (참고) ──────────┐ │
│  │  기존 관리 페이지로 이동 →                │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 3-3. 스케줄 편집 모달

**새 파일**: `apps/frontend-next/src/app/dashboard/admin/alarm-schedules/components/ScheduleEditModal.tsx`

**입력 필드**:
- Cron 표현식 직접 입력 OR 간편 선택기 (분/시간 간격, 특정 시각)
- 타임존 선택 (기본: Asia/Seoul)
- 활성/비활성 토글
- 다음 실행 예정 시각 미리보기

### 3-4. 사이드바 메뉴 추가

**파일**: 사이드바 네비게이션에 "알림 스케줄 관리" 메뉴 추가

---

## Phase 4: 검증

- [ ] TypeScript 빌드 통과
- [ ] Prisma 마이그레이션 정상 적용
- [ ] 시드 데이터로 3개 기본 스케줄 생성 확인
- [ ] API 엔드포인트 CRUD 동작 확인
- [ ] 스케줄 수정 시 실시간 cron 반영 확인
- [ ] 프론트엔드 통합 페이지 렌더링 확인
- [ ] 스케줄 토글 (활성/비활성) 동작 확인

---

## 파일 변경 목록

### 새로 생성 (8개)
| 파일 | 설명 |
|------|------|
| `apps/backend/src/alarm-schedule/alarm-schedule.module.ts` | 모듈 |
| `apps/backend/src/alarm-schedule/alarm-schedule.controller.ts` | REST API |
| `apps/backend/src/alarm-schedule/alarm-schedule.service.ts` | CRUD + cron 관리 |
| `apps/backend/src/alarm-schedule/dto/alarm-schedule.dto.ts` | DTO |
| `apps/frontend-next/src/services/alarmScheduleService.ts` | API 클라이언트 |
| `apps/frontend-next/src/hooks/queries/use-alarm-schedules.ts` | React Query 훅 |
| `apps/frontend-next/src/app/dashboard/admin/alarm-schedules/page.tsx` | 통합 관리 페이지 |
| `apps/frontend-next/src/app/dashboard/admin/alarm-schedules/components/ScheduleEditModal.tsx` | 편집 모달 |

### 수정 (6개)
| 파일 | 변경 내용 |
|------|-----------|
| `apps/backend/prisma/schema.prisma` | `AlarmSchedule` 모델 추가 |
| `apps/backend/prisma/seed.ts` | 기본 스케줄 3개 시드 |
| `apps/backend/src/app.module.ts` | `AlarmScheduleModule` import |
| `apps/backend/src/job-monitoring/job-monitoring.service.ts` | `@Cron` 제거, 메서드 public 유지 |
| `apps/backend/src/report-monitoring/report-monitoring.scheduler.ts` | 환경변수 → DB 소스 전환 |
| `apps/backend/src/report-monitoring/ui-check.scheduler.ts` | 환경변수 → DB 소스 전환 |

---

## 예상 작업량
- Backend: ~300줄 (새 모듈) + ~50줄 (기존 수정)
- Frontend: ~400줄 (페이지 + 모달 + 훅 + 서비스)
- 총 ~750줄, Phase 4개
