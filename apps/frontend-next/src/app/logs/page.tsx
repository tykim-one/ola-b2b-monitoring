import LogExplorer from '@/components/LogExplorer';
import { B2BLog } from '@/types';

async function getLogs(): Promise<B2BLog[]> {
  try {
    const res = await fetch('http://localhost:3000/bigquery/logs?limit=50', {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch logs:', res.statusText);
      return [];
    }
    
    const response = await res.json();
    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
}

export default async function LogsPage() {
  const logs = await getLogs();
  
  return <LogExplorer logs={logs} />;
}
