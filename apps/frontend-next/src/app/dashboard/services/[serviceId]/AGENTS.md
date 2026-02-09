<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# [serviceId]/

## Purpose
서비스별 동적 대시보드 루트. URL 파라미터로 전달된 `serviceId`에 따라 해당 서비스의 개요 페이지를 표시하고, 서브 메뉴를 통해 세부 페이지로 이동할 수 있는 레이아웃을 제공합니다.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | 서비스 개요 페이지 - ServiceCard, 빠른 링크, 서비스 정보, 헬스 체크 표시 |
| `layout.tsx` | 서비스 레이아웃 - 서비스 헤더(아이콘, 이름, 설명) 및 서브 네비게이션 메뉴 제공 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `ai-performance/` | AI 성능 모니터링 (KPI, 실시간 트래픽, 에러 게이지) (see `ai-performance/AGENTS.md`) |
| `batch-analysis/` | 배치 분석 (admin 페이지로 리다이렉트) (see `batch-analysis/AGENTS.md`) |
| `business/` | 비즈니스 메트릭 (토큰 사용량, 비용, 테넌트 분석) (see `business/AGENTS.md`) |
| `data-loading/` | 데이터 적재 현황 |
| `logs/` | 에러 로그 조회 |
| `quality/` | 품질 분석 |
| `status/` | 배치/ETL 처리 현황 (BatchStatusContent, ETLStatusContent) |
| `users/` | 유저 분석 |

## For AI Agents
### Working In This Directory
- **동적 라우팅**: `useParams()`로 `serviceId` 추출, `getServiceConfig(serviceId)`로 서비스 설정 조회
- **레이아웃 패턴**:
  - `layout.tsx`는 서비스 헤더와 서브 네비게이션을 제공
  - `page.tsx`는 서비스 개요 (ServiceCard, 빠른 링크, 서비스 정보)
- **헬스 체크**: `useServiceHealth` 훅으로 서비스 상태 폴링 (30초 간격)
- **서비스 컨텍스트**: 하위 페이지는 `useServiceContext()`로 `serviceId`, `projectId`, `config` 접근
- **에러 처리**: 서비스 설정이 없으면 에러 메시지 표시

### Common Patterns
```tsx
// 서비스 컨텍스트 사용
const ctx = useServiceContext();
if (!ctx) return <ErrorMessage />;

// 헬스 체크 데이터 가져오기
const { data, loading, error } = useServiceHealth({
  serviceId,
  config,
  refreshInterval: 30000,
});
```

## Dependencies
### Internal
- `@/config/services` - `getServiceConfig()` 서비스 설정 조회
- `@/hooks/useServiceHealth` - 서비스 헬스 체크 훅
- `@/hooks/useServiceContext` - 서비스 컨텍스트 훅
- `@/components/service/ServiceCard` - 서비스 카드 컴포넌트
- `@/components/ui/badge` - Badge 컴포넌트
- `lucide-react` - 아이콘 라이브러리

### External
- `next/navigation` - `useParams()`, `Link`
