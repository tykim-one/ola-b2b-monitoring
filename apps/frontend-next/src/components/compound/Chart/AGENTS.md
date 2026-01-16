<!-- Parent: ../AGENTS.md -->
# Chart

## Purpose
차트 래퍼 Compound Component입니다. 제목, 범례, 메트릭 표시를 포함한 차트 컨테이너를 제공합니다.

## Key Files
- `index.tsx` - Chart Compound Component (Root + 서브컴포넌트)

## Compound Structure
```tsx
Chart (Root)
├── Chart.Legend   // 색상 범례 아이템 표시
└── Chart.Metrics  // 요약 메트릭 표시
```

## For AI Agents
- **ResponsiveContainer**: Recharts의 반응형 컨테이너 내장
- **title/subtitle**: 차트 제목 섹션 기본 제공
- **사용법**:
  ```tsx
  <Chart title="사용량 추이" subtitle="최근 30일">
    <AreaChart data={data}>...</AreaChart>
    <Chart.Legend items={[{ color: '#3b82f6', label: '토큰' }]} />
  </Chart>
  ```
