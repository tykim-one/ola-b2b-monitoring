import { LogTableWidget } from '@/widgets/log-table-widget';
import { ProjectSwitcher } from '@/widgets/project-switcher';
// import { B2BLog } from '@/entities/log/model'; // TODO: Fix import path alias or use relative
import { B2BLog } from '../../../entities/log/model';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function getLogs(projectId: string): Promise<B2BLog[]> {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${backendUrl}/projects/${projectId}/api/logs?limit=50`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
        // Fallback or handle error
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

export default async function ProjectLogsPage({ params }: PageProps) {
  const { projectId } = await params;
  const logs = await getLogs(projectId);
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans selection:bg-purple-500/30">
        {/* Top Navigation / Header could go here or be part of Layout */}
        <div className="border-b border-gray-200 p-4 bg-gray-50 backdrop-blur flex items-center justify-between">
            <div className="flex items-center gap-4">
               <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  OLA B2B Monitor
               </h1>
               <div className="h-6 w-px bg-gray-100"></div>
               <ProjectSwitcher currentProjectId={projectId} />
            </div>
            {/* User Profile or other global actions */}
        </div>

        <div className="flex-1 overflow-hidden relative">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 h-full">
                <LogTableWidget logs={logs} />
            </div>
        </div>
    </div>
  );
}
