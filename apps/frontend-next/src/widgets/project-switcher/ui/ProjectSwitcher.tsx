'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Box, Command } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/**
 * Hardcoded projects for now. In real app, fetch from API or config.
 */
const PROJECTS = [
  { id: 'ibks', name: 'IBKS' },
  { id: 'demo', name: 'Demo Project' },
  { id: 'ko-llm', name: 'Ko-LLM Lab' },
];

export default function ProjectSwitcher({ currentProjectId }: { currentProjectId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentProject = PROJECTS.find(p => p.id === currentProjectId) || { id: currentProjectId, name: currentProjectId };

  const handleSwitch = (projectId: string) => {
    // Basic logic: Replace current project ID in URL with new one.
    // e.g., /ibks/logs -> /demo/logs
    // Careful with paths that might not have projectId at root, but our design assumes /[projectId]/...
    const newPath = window.location.pathname.replace(`/${currentProjectId}`, `/${projectId}`);
    router.push(newPath);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
      >
        <div className="w-6 h-6 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-400">
            <Box size={14} />
        </div>
        <span>{currentProject.name}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
           <div className="p-2 border-b border-gray-200 bg-gray-50">
             <div className="text-xs text-gray-400 font-semibold px-2 py-1 uppercase tracking-wider">Switch Project</div>
           </div>
          <div className="p-1">
            {PROJECTS.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSwitch(project.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  project.id === currentProjectId
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-gray-500 hover:bg-white hover:text-gray-900'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${project.id === currentProjectId ? 'bg-indigo-400' : 'bg-gray-300'}`} />
                {project.name}
              </button>
            ))}
            <div className="h-px bg-white my-1" />
             <button
                className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
              >
                <Command size={14} />
                <span>Manage Workspace...</span>
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
