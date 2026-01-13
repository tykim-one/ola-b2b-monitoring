'use client';

import { useState, useEffect } from 'react';
import LogExplorer from '@/components/LogExplorer';
import { B2BLog } from '@/types';
import { generateMockLogs } from '@/lib/constants';

export default function LogsPage() {
  const [logs, setLogs] = useState<B2BLog[]>([]);

  useEffect(() => {
    setLogs(generateMockLogs(200));

    // Simulate real-time updates
    const interval = setInterval(() => {
      const newLogs = generateMockLogs(2);
      setLogs(prev => [...newLogs, ...prev].slice(0, 500)); // Keep buffer of 500
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return <LogExplorer logs={logs} />;
}
