'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  CalendarClock,
  MessageSquare,
  HelpCircle,
  GitBranch,
} from 'lucide-react';
import ChatQualityTab from './components/ChatQualityTab';
import FAQAnalysisTab from './components/FAQAnalysisTab';
import SessionAnalysisTab from './components/SessionAnalysisTab';

type TabType = 'chat-quality' | 'faq-analysis' | 'session-analysis';

export default function BatchAnalysisPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('chat-quality');

  const tabs = [
    {
      id: 'chat-quality' as TabType,
      label: 'Chat Quality',
      icon: MessageSquare,
      color: 'cyan',
      description: 'Daily chat quality analysis',
    },
    {
      id: 'faq-analysis' as TabType,
      label: 'FAQ Analysis',
      icon: HelpCircle,
      color: 'violet',
      description: 'FAQ clustering & reason analysis',
    },
    {
      id: 'session-analysis' as TabType,
      label: 'Session Analysis',
      icon: GitBranch,
      color: 'emerald',
      description: 'Session resolution & efficiency',
    },
  ];

  const getTabStyles = (tab: typeof tabs[0], isActive: boolean) => {
    const baseStyles = 'flex items-center gap-2 px-6 py-3 font-mono font-bold uppercase tracking-wider text-sm transition-all border-b-2';

    if (isActive) {
      if (tab.color === 'cyan') {
        return `${baseStyles} text-cyan-400 border-cyan-400 bg-cyan-950/30`;
      }
      if (tab.color === 'emerald') {
        return `${baseStyles} text-emerald-400 border-emerald-400 bg-emerald-950/30`;
      }
      return `${baseStyles} text-violet-400 border-violet-400 bg-violet-950/30`;
    }

    return `${baseStyles} text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50`;
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
              Batch Analysis
            </h1>
            <p className="text-slate-400 font-mono text-sm">
              SYSTEM.ADMIN.BATCH_ANALYSIS // Data Analysis Pipeline
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/admin/batch-analysis/prompts')}
              className="
                flex items-center gap-2 px-4 py-3
                bg-slate-800 hover:bg-slate-700 border border-slate-700
                text-slate-300 font-mono font-bold uppercase tracking-wider text-sm
                transition-all
              "
            >
              <FileText className="w-4 h-4" />
              Prompts
            </button>
            <button
              onClick={() => router.push('/dashboard/admin/batch-analysis/schedules')}
              className="
                flex items-center gap-2 px-4 py-3
                bg-slate-800 hover:bg-slate-700 border border-violet-500/50
                text-violet-300 font-mono font-bold uppercase tracking-wider text-sm
                transition-all
              "
            >
              <CalendarClock className="w-4 h-4" />
              Schedules
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-800">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={getTabStyles(tab, isActive)}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'chat-quality' && <ChatQualityTab />}
        {activeTab === 'faq-analysis' && <FAQAnalysisTab />}
        {activeTab === 'session-analysis' && <SessionAnalysisTab />}
      </div>
    </div>
  );
}
