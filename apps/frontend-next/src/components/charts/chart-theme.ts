/**
 * Recharts 라이트 테마 공통 상수
 * 모든 차트 컴포넌트에서 이 상수를 import하여 일관된 스타일 유지
 */

export const CHART_COLORS = {
  /** CartesianGrid stroke */
  grid: '#e2e8f0',
  /** XAxis / YAxis stroke */
  axis: '#94a3b8',
  /** Axis tick & label fill */
  axisText: '#64748b',
  /** Tooltip cursor / hover background */
  cursor: '#f1f5f9',
  /** RadialBar / gauge background fill */
  bgFill: '#f1f5f9',
} as const;

export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  color: '#1e293b',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
};
