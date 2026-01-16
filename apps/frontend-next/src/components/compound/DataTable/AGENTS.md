<!-- Parent: ../AGENTS.md -->
# DataTable

## Purpose
데이터 테이블 Compound Component입니다. 검색, 정렬, 필터링 기능을 포함한 테이블 UI를 제공합니다.

## Key Files
- `index.tsx` - DataTable Compound Component (Root + 서브컴포넌트)

## Compound Structure
```tsx
DataTable<T> (Root - Generic)
├── DataTable.Toolbar   // 상단 도구 영역 (검색, 버튼 등)
├── DataTable.Search    // 검색 입력 필드
├── DataTable.Header    // 테이블 헤더 (정렬 가능)
├── DataTable.Body      // 테이블 바디
├── DataTable.Row       // 테이블 행
└── DataTable.Cell      // 테이블 셀
```

## For AI Agents
- **Generic Type**: `<T extends object>` - 타입 안전한 데이터 처리
- **Context 패턴**: DataTableContext로 data, filteredData, sorting 공유
- **검색/정렬**: searchFields prop으로 검색 대상 필드 지정
- **사용법**:
  ```tsx
  <DataTable data={users} columns={columns} searchFields={['name', 'email']}>
    <DataTable.Toolbar>
      <DataTable.Search placeholder="검색..." />
      <Button>추가</Button>
    </DataTable.Toolbar>
    {/* 테이블 렌더링 */}
  </DataTable>
  ```
