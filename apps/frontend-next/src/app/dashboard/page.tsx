'use client';

import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import { MetricData } from '@/types';
import { generateMetrics } from '@/lib/constants';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);

  useEffect(() => {
    setMetrics(generateMetrics());
  }, []);

  return <Dashboard metrics={metrics} />;
}
