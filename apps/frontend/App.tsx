import { useState, useEffect } from 'react';
import { ViewState, B2BLog, MetricData } from './types';
import { generateMockLogs, generateMetrics } from './constants';
import Dashboard from './components/Dashboard';
import LogExplorer from './components/LogExplorer';
import ArchitectureView from './components/ArchitectureView';

const App = () => {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [logs, setLogs] = useState<B2BLog[]>([]);
  const [metrics, setMetrics] = useState<MetricData[]>([]);

  // Simulate initial data fetch
  useEffect(() => {
    setLogs(generateMockLogs(200));
    setMetrics(generateMetrics());

    // Simulate real-time updates
    const interval = setInterval(() => {
      const newLogs = generateMockLogs(2);
      setLogs(prev => [...newLogs, ...prev].slice(0, 500)); // Keep buffer of 500
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">OLA-B2B Monitoring</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setView(ViewState.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              view === ViewState.DASHBOARD ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </button>
          
          <button 
            onClick={() => setView(ViewState.LOGS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              view === ViewState.LOGS ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Log Explorer
          </button>

          <button 
            onClick={() => setView(ViewState.ARCHITECTURE)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              view === ViewState.ARCHITECTURE ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Architecture
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            NestJS 백엔드: 연결됨
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-slate-950 overflow-hidden relative">
        {view === ViewState.DASHBOARD && <Dashboard metrics={metrics} />}
        {view === ViewState.LOGS && <LogExplorer logs={logs} />}
        {view === ViewState.ARCHITECTURE && <ArchitectureView />}
      </main>
    </div>
  );
};

export default App;
