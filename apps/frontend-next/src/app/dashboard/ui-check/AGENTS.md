<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# ui-check

## Purpose
UI 모니터링 독립 페이지. Playwright 기반으로 리포트 페이지의 UI 상태(구조, 콘텐츠, 렌더링, 에러)를 자동 체크하고, 결과를 시각화합니다. report-monitoring의 데이터 품질 체크와 분리된 별도 페이지입니다.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | UI 체크 메인 페이지 (KPI, 결과 테이블, 이슈 상세, 이력, 설정 템플릿, 시스템 상태) |

## Page Sections
| Section | Component | Description |
|---------|-----------|-------------|
| KPI Cards | `Dashboard.KPISection` | 전체 타겟, 정상, 경고, 장애, 콘텐츠 완전성 (5열) |
| 결과 테이블 | `DataTable` | 타겟별 UI 상태 요약 (리포트명, 상태, 통과/실패, 로딩시간, 콘텐츠율) |
| 이슈 상세 | `UiIssueDetailSection` | category별 그룹핑 (structure/content/rendering/error), 실패 디버깅 정보 |
| 체크 이력 | `UiCheckHistorySection` | 과거 체크 이력 테이블 + 클릭 시 상세 결과 패널 |
| 설정 템플릿 | `CheckConfigSection` | 타겟별 체크 설정 조회/인라인 수정 (minCount, minContentLength, minItems) |
| 시스템 상태 | `SystemStatusFooter` | 스케줄러 상태, cron 표현식, 다음 실행 시간 |

## For AI Agents
### Working In This Directory
- **URL**: `/dashboard/ui-check`
- **상태 타입**: `healthy` (정상), `degraded` (경고), `broken` (장애)
- **체크 카테고리**: `structure` (구조), `content` (콘텐츠), `rendering` (렌더링), `error` (에러)
- **설정 편집**: `EditableNumber` 컴포넌트로 minCount, minContentLength, minItems 인라인 수정 가능
- **이력 조회**: 행 클릭으로 상세 결과 패널 토글 (`selectedHistoryId` state)
- **실시간 결과 없을 때**: 서버 재시작 후 이력만 표시하는 간소화된 배너 제공

### Key Types
- `UiPageCheckResult` - 타겟별 체크 결과 (targetId, targetName, status, checks[], consoleErrors[])
- `SingleCheckResult` - 개별 체크 결과 (type, category, status, description, selector, expected, actual, details)
- `UiCheckHistoryItem` - 체크 이력 항목 (id, trigger, totalTargets, healthyTargets, ...)
- `UiCheckConfigTarget` - 설정 타겟 (id, name, urlTemplate, theme, checks[])
- `UiCheckConfigCheck` - 개별 설정 체크 (type, description, selector, minCount, minContentLength, ...)

### Common Patterns
- `useMemo` 없이 인라인 계산 (콘텐츠 완전성 KPI) - 데이터 크기가 작아 최적화 불필요
- `useCallback`으로 설정 저장 핸들러 메모이제이션 (mutation 의존성)
- 카테고리별 색상/아이콘 매핑: `categoryConfig` 객체
- 체크 타입별 색상: `CHECK_TYPE_COLORS` 상수

## Dependencies
### Internal
- `@/components/compound/Dashboard` - 대시보드 레이아웃
- `@/components/compound/DataTable` - 테이블 + 페이지네이션
- `@/components/kpi/KPICard` - KPI 카드
- `@/components/ui/StatusBadge` - 상태 배지
- `@/components/ui/EmptyState` - 빈 상태 안내
- `@/hooks/queries/use-report-monitoring` - React Query 훅 (useUiCheckResult, useUiCheckHistory, useUiCheckHistoryDetail, useRunUiCheck, useUiCheckHealth, useUiCheckConfig, useUpdateUiCheckConfig)
- `@/services/reportMonitoringService` - API 클라이언트 타입 (UiCheckConfigTarget, UiCheckConfigCheck)
- `@ola/shared-types` - 공유 타입 (UiPageCheckResult, SingleCheckResult, UiCheckHistoryItem)

### External
- `lucide-react` - 아이콘 라이브러리
