'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { FloatingChatbot } from '@/components/chatbot';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show sidebar on login page
  const isLoginPage = pathname === '/login';

  // Show sidebar on all pages except login page
  if (!isLoginPage) {
    return (
      <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
        <Sidebar />
        <main className="flex-1 bg-slate-950 overflow-hidden relative">
          {children}
        </main>
        <FloatingChatbot />
      </div>
    );
  }

  // For login page, show without sidebar
  return <>{children}</>;
}
