<!-- Parent: ../AGENTS.md -->
# Dashboard

## Purpose
대시보드 레이아웃 Compound Component입니다. 로딩/에러 상태 처리와 KPI/차트 섹션 레이아웃을 제공합니다.

## Key Files
- `index.tsx` - Dashboard Compound Component (Root + 서브컴포넌트)

## Compound Structure
```tsx
Dashboard (Root)
├── Dashboard.Header      // 제목, 설명 표시
├── Dashboard.Skeleton    // 로딩 스켈레톤 UI
├── Dashboard.Error       // 에러 메시지 표시
├── Dashboard.Content     // 콘텐츠 래퍼 (로딩/에러 시 숨김)
├── Dashboard.KPISection  // KPI 카드 그리드 (columns prop)
├── Dashboard.ChartsSection // 차트 그리드 (columns prop)
└── Dashboard.TableSection  // 테이블 섹션
```

## For AI Agents
- **Context 패턴**: DashboardContext로 isLoading, error 공유
- **Object.assign**: Root에 서브컴포넌트 연결
- **사용법**:
  ```tsx
  <Dashboard isLoading={loading} error={error}>
    <Dashboard.Header title="대시보드" />
    <Dashboard.Skeleton />
    <Dashboard.Error />
    <Dashboard.Content>
      <Dashboard.KPISection columns={4}>...</Dashboard.KPISection>
    </Dashboard.Content>
  </Dashboard>
  ```
