'use client';

/**
 * Re-export Recharts components.
 * This file ensures Recharts is only imported on the client side.
 * Import from '@/lib/recharts' instead of 'recharts' directly.
 */
export {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  Area,
  AreaChart,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
