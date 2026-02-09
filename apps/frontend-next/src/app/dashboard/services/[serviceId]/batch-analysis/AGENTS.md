<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# batch-analysis/

## Purpose
서비스별 배치 분석 페이지. 실제로는 기존 어드민 배치 분석 페이지(`/dashboard/admin/batch-analysis`)로 리다이렉트하는 역할만 수행합니다.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | 리다이렉트 페이지 - `/dashboard/admin/batch-analysis`로 자동 이동 |

## For AI Agents
### Working In This Directory
- **기능**: 이 페이지는 실제 컨텐츠를 표시하지 않고 즉시 리다이렉트함
- **리다이렉트 대상**: `/dashboard/admin/batch-analysis` (어드민 배치 분석 페이지)
- **리다이렉트 구현**: `useEffect`에서 `router.replace()` 사용
- **로딩 상태**: 리다이렉트 중 `Loader2` 스피너 표시

### Implementation Details
```tsx
useEffect(() => {
  router.replace('/dashboard/admin/batch-analysis');
}, [router]);

// 리다이렉트 중 로딩 UI
<Loader2 className="w-8 h-8 animate-spin text-blue-500" />
<p className="text-gray-500">배치 분석 페이지로 이동 중...</p>
```

### Why This Exists
- 서비스별 메뉴(`config.menu`)에 `batch-analysis` 항목이 있지만, 실제로는 전역 어드민 페이지를 사용
- 서비스별 독립적인 배치 분석이 아닌, 모든 서비스 공통 배치 분석 페이지로 통합

## Dependencies
### Internal
- `@/hooks/useServiceContext` - 서비스 컨텍스트 (에러 체크용)

### External
- `next/navigation` - `useRouter()`로 리다이렉트
- `lucide-react` - `Loader2` 로딩 스피너
