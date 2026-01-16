<!-- Parent: ../AGENTS.md -->
# compound

## Purpose
Compound Component 패턴을 적용한 복합 UI 컴포넌트입니다. Object.assign으로 서브컴포넌트를 연결하여 선언적이고 유연한 조합을 지원합니다.

## Subdirectories
- `Dashboard/` - 대시보드 레이아웃 컴포넌트 (Header, KPISection, ChartsSection, Skeleton, Error 등)
- `DataTable/` - 데이터 테이블 컴포넌트 (Toolbar, Search, Header, Body, Row, Cell)
- `Chart/` - 차트 래퍼 컴포넌트 (Legend, Metrics)

## Key Files
- `index.ts` - 배럴 익스포트

## For AI Agents
- **Compound 패턴**: `Object.assign(Root, { Sub1, Sub2 })`로 구성
- **Context 활용**: Root에서 Context 제공, 서브컴포넌트에서 useContext로 소비
- **사용 예시**:
  ```tsx
  <Dashboard isLoading={loading} error={error}>
    <Dashboard.Header title="비즈니스 분석" />
    <Dashboard.Skeleton />
    <Dashboard.Error />
    <Dashboard.Content>
      <Dashboard.KPISection columns={4}>...</Dashboard.KPISection>
    </Dashboard.Content>
  </Dashboard>
  ```
- **새 Compound 추가 시**:
  1. 디렉토리 생성 (예: `components/compound/Form/`)
  2. index.tsx에 Root + 서브컴포넌트 정의
  3. Context로 공유 상태 관리
  4. Object.assign으로 합성
  5. compound/index.ts에서 re-export
