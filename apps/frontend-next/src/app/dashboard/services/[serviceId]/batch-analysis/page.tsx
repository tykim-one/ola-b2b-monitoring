'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useServiceContext } from '@/hooks/useServiceContext';
import { Loader2 } from 'lucide-react';

export default function ServiceBatchAnalysisPage() {
  const ctx = useServiceContext();
  const router = useRouter();

  useEffect(() => {
    // 기존 admin/batch-analysis 페이지로 리다이렉트
    router.replace('/dashboard/admin/batch-analysis');
  }, [router]);

  if (!ctx) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-gray-50">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
          <p className="text-rose-600">서비스 컨텍스트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-gray-500">배치 분석 페이지로 이동 중...</p>
      </div>
    </div>
  );
}
