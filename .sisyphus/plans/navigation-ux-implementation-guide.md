# 네비게이션 UX 개선 - 구현 가이드

> **버전**: v2.1 (Momus 2차 리뷰 완료)
> **작성일**: 2026-02-05
> **예상 소요**: 4주 (1개월)
> **관련 계획서**: `.sisyphus/plans/navigation-ux-improvement.md`

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [사전 준비](#2-사전-준비)
3. [Phase 1: 기반 구조 구축](#3-phase-1-기반-구조-구축-week-1-day-1-3)
4. [Phase 2: 사이드바 리팩토링](#4-phase-2-사이드바-리팩토링-week-1-day-4-5)
5. [Phase 3: 라우팅 재구성](#5-phase-3-라우팅-재구성-week-2)
6. [Phase 4: 미들웨어 및 정리](#6-phase-4-미들웨어-및-정리-week-3-day-1-2)
7. [Phase 5: 마무리](#7-phase-5-마무리-week-3-4)
8. [테스트 체크리스트](#8-테스트-체크리스트)
9. [롤백 가이드](#9-롤백-가이드)

---

## 1. 프로젝트 개요

### 1.1 목표
- 서비스 드롭다운 + 동적 메뉴로 네비게이션 개선
- 10개 이상 서비스 확장에 대응하는 구조
- 모든 UI 한국어 통일
- 각 페이지에 가이드 문구 추가

### 1.2 현재 서비스 구성
| 서비스 ID | 서비스명 | 페이지 수 |
|-----------|----------|-----------|
| `ibk-chat` | IBK Chat | 14개 |
| `wind-etl` | Wind ETL | 1개 |
| `minkabu-etl` | Minkabu ETL | 1개 |
| `ibk-report` | IBK Report | 1개 |

### 1.3 URL 구조 변경
```
현재: /dashboard/quality
변경: /dashboard/ibk-chat/quality

현재: /dashboard/etl/wind
변경: /dashboard/wind-etl/status
```

---

## 2. 사전 준비

### 2.1 브랜치 생성
```bash
git checkout dev
git pull origin dev
git checkout -b feature/navigation-ux-improvement
```

### 2.2 의존성 확인
```bash
cd apps/frontend-next
# lucide-react 이미 설치됨 (^0.562.0)
pnpm list lucide-react
```

### 2.3 개발 서버 실행
```bash
# 루트에서
pnpm dev:all
```

---

## 3. Phase 1: 기반 구조 구축 (Week 1, Day 1-3)

### Step 1.1: config 디렉토리 생성

```bash
mkdir -p apps/frontend-next/src/config
```

### Step 1.2: 서비스 설정 파일 생성

**파일**: `apps/frontend-next/src/config/services.config.ts`

```typescript
import {
  Activity,
  Cpu,
  CheckCircle,
  MessageSquare,
  Users,
  Layers,
  AlertTriangle,
  BarChart,
  FileText,
  Shield,
  Filter,
  Brain,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

// lucide-react 버전 호환 타입
export type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export interface MenuConfig {
  id: string;
  label: string;
  icon: IconComponent;
  href: string;
  description: string;
  subMenus?: MenuConfig[];
}

export interface ServiceConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  menus: MenuConfig[];
}

export const servicesConfig: ServiceConfig[] = [
  {
    id: 'ibk-chat',
    name: 'IBK Chat',
    emoji: '💬',
    description: 'IBK 챗봇 서비스 모니터링 및 분석',
    menus: [
      {
        id: 'operations',
        label: '운영 현황',
        icon: Activity,
        href: 'operations',
        description: '실시간 트래픽, 응답 시간, 에러율 등 핵심 운영 지표를 확인합니다.',
      },
      {
        id: 'ai-performance',
        label: 'AI 성능',
        icon: Cpu,
        href: 'ai-performance',
        description: 'AI 모델의 응답 품질, 토큰 사용량, 처리 시간을 분석합니다.',
      },
      {
        id: 'quality',
        label: '품질 분석',
        icon: CheckCircle,
        href: 'quality',
        description: '챗봇 응답의 정확도와 사용자 만족도 지표를 모니터링합니다.',
      },
      {
        id: 'chatbot-quality',
        label: '챗봇 품질',
        icon: MessageSquare,
        href: 'chatbot-quality',
        description: '개별 대화의 품질을 상세 분석하고 문제 패턴을 탐지합니다.',
      },
      {
        id: 'user-analytics',
        label: '유저 분석',
        icon: Users,
        href: 'user-analytics',
        description: '사용자별 활동 패턴, 선호도, 이탈 위험을 분석합니다.',
      },
      {
        id: 'batch-analysis',
        label: '배치 분석',
        icon: Layers,
        href: 'batch-analysis',
        description: '대량 데이터 분석 작업을 생성하고 결과를 확인합니다.',
        subMenus: [
          {
            id: 'schedules',
            label: '스케줄 관리',
            icon: Layers,
            href: 'batch-analysis/schedules',
            description: '자동 분석 스케줄을 설정합니다.',
          },
          {
            id: 'prompts',
            label: '프롬프트 관리',
            icon: Layers,
            href: 'batch-analysis/prompts',
            description: '분석에 사용할 프롬프트 템플릿을 관리합니다.',
          },
          {
            id: 'issue-frequency',
            label: '이슈 빈도',
            icon: Layers,
            href: 'batch-analysis/issue-frequency',
            description: '자주 발생하는 이슈 패턴을 확인합니다.',
          },
        ],
      },
      {
        id: 'problematic-rules',
        label: '문제 탐지 규칙',
        icon: AlertTriangle,
        href: 'problematic-rules',
        description: '문제 대화를 자동 탐지하는 규칙을 설정합니다.',
      },
      {
        id: 'business',
        label: '비용/사용량',
        icon: BarChart,
        href: 'business',
        description: 'API 호출 비용과 토큰 사용량 트렌드를 확인합니다.',
      },
    ],
  },
  {
    id: 'wind-etl',
    name: 'Wind ETL',
    emoji: '🌬️',
    description: 'Wind 데이터 ETL 파이프라인 모니터링',
    menus: [
      {
        id: 'status',
        label: 'ETL 상태',
        icon: Activity,
        href: 'status',
        description: 'Wind 데이터 파이프라인의 실행 상태와 히스토리를 확인합니다.',
      },
    ],
  },
  {
    id: 'minkabu-etl',
    name: 'Minkabu ETL',
    emoji: '📊',
    description: 'Minkabu 데이터 ETL 파이프라인 모니터링',
    menus: [
      {
        id: 'status',
        label: 'ETL 상태',
        icon: Activity,
        href: 'status',
        description: 'Minkabu 데이터 파이프라인의 실행 상태와 히스토리를 확인합니다.',
      },
    ],
  },
  {
    id: 'ibk-report',
    name: 'IBK Report',
    emoji: '📑',
    description: 'IBK 리포트 서비스 모니터링',
    menus: [
      {
        id: 'status',
        label: '리포트 상태',
        icon: FileText,
        href: 'status',
        description: '리포트 생성 및 배포 상태를 확인합니다.',
      },
    ],
  },
];

// 시스템 관리 메뉴 (서비스와 무관, 전역)
export const systemMenus: MenuConfig[] = [
  {
    id: 'users',
    label: '사용자 관리',
    icon: Users,
    href: '/dashboard/admin/users',
    description: '시스템 사용자 계정을 관리합니다.',
  },
  {
    id: 'roles',
    label: '역할 관리',
    icon: Shield,
    href: '/dashboard/admin/roles',
    description: '사용자 역할과 접근 권한을 설정합니다.',
  },
  {
    id: 'filters',
    label: '필터 관리',
    icon: Filter,
    href: '/dashboard/admin/filters',
    description: '저장된 데이터 필터를 관리합니다.',
  },
  {
    id: 'analysis',
    label: 'AI 분석',
    icon: Brain,
    href: '/dashboard/admin/analysis',
    description: 'AI 기반 데이터 분석 세션을 관리합니다.',
  },
];

// 헬퍼 함수
export function getServiceById(serviceId: string): ServiceConfig | undefined {
  return servicesConfig.find((s) => s.id === serviceId);
}

export function getMenuDescription(serviceId: string, menuId: string): string | undefined {
  const service = getServiceById(serviceId);
  if (!service) return undefined;
  const menu = service.menus.find((m) => m.id === menuId);
  return menu?.description;
}

export const SERVICE_IDS = servicesConfig.map((s) => s.id);
```

### Step 1.3: ServiceContext 생성

**파일**: `apps/frontend-next/src/contexts/ServiceContext.tsx`

```typescript
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  servicesConfig,
  ServiceConfig,
  getServiceById,
  SERVICE_IDS,
} from '@/config/services.config';

interface ServiceContextType {
  currentService: ServiceConfig | null;
  setCurrentService: (serviceId: string) => void;
  services: ServiceConfig[];
  isServicePage: boolean;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [currentService, setCurrentServiceState] = useState<ServiceConfig | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // URL에서 서비스 ID 추출하여 상태 동기화
  useEffect(() => {
    if (pathname?.startsWith('/dashboard/')) {
      const segments = pathname.split('/');
      const potentialServiceId = segments[2];

      if (SERVICE_IDS.includes(potentialServiceId)) {
        const service = getServiceById(potentialServiceId);
        if (service && service.id !== currentService?.id) {
          setCurrentServiceState(service);
        }
      }
    }
  }, [pathname, currentService?.id]);

  const setCurrentService = useCallback(
    (serviceId: string) => {
      const service = getServiceById(serviceId);
      if (service) {
        setCurrentServiceState(service);
        const firstMenu = service.menus[0];
        if (firstMenu) {
          router.push(`/dashboard/${serviceId}/${firstMenu.href}`);
        }
      }
    },
    [router]
  );

  const isServicePage =
    pathname?.startsWith('/dashboard/') &&
    SERVICE_IDS.includes(pathname.split('/')[2] || '');

  return (
    <ServiceContext.Provider
      value={{
        currentService,
        setCurrentService,
        services: servicesConfig,
        isServicePage,
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
}

export function useService(): ServiceContextType {
  const context = useContext(ServiceContext);

  // Provider 외부에서 사용 시 안전한 기본값 반환 (hydration 크래시 방지)
  if (!context) {
    return {
      currentService: null,
      setCurrentService: () => {
        console.warn('ServiceProvider not found');
      },
      services: servicesConfig,
      isServicePage: false,
    };
  }

  return context;
}
```

### Step 1.4: Providers.tsx 수정

**파일**: `apps/frontend-next/src/app/providers.tsx`

**변경 내용**: ServiceProvider 추가

```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query-client';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatbotProvider } from '@/contexts/ChatbotContext';
import { ServiceProvider } from '@/contexts/ServiceContext'; // 추가

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ServiceProvider>
          <ChatbotProvider>{children}</ChatbotProvider>
        </ServiceProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Step 1.5: PageGuide 컴포넌트 생성

**파일**: `apps/frontend-next/src/components/ui/PageGuide.tsx`

```typescript
import { Info } from 'lucide-react';

interface PageGuideProps {
  title: string;
  description: string;
  className?: string;
}

export function PageGuide({ title, description, className = '' }: PageGuideProps) {
  return (
    <div
      className={`mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl ${className}`}
    >
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
```

### Step 1.6: ServiceSelector 컴포넌트 생성

**파일**: `apps/frontend-next/src/components/ui/ServiceSelector.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useService } from '@/contexts/ServiceContext';

export function ServiceSelector() {
  const { currentService, setCurrentService, services } = useService();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (serviceId: string) => {
    setCurrentService(serviceId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{currentService?.emoji || '🔍'}</span>
          <span className="font-medium text-gray-900">
            {currentService?.name || '서비스 선택'}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleSelect(service.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                currentService?.id === service.id ? 'bg-blue-50' : ''
              }`}
            >
              <span className="text-xl">{service.emoji}</span>
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">{service.name}</div>
                <div className="text-xs text-gray-500">{service.description}</div>
              </div>
              {currentService?.id === service.id && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 1.7: Phase 1 완료 체크

- [ ] `src/config/services.config.ts` 생성 완료
- [ ] `src/contexts/ServiceContext.tsx` 생성 완료
- [ ] `src/app/providers.tsx` 수정 완료
- [ ] `src/components/ui/PageGuide.tsx` 생성 완료
- [ ] `src/components/ui/ServiceSelector.tsx` 생성 완료
- [ ] 개발 서버 정상 실행 확인
- [ ] TypeScript 컴파일 에러 없음 확인

```bash
# 컴파일 확인
cd apps/frontend-next && pnpm build
```

---

## 4. Phase 2: 사이드바 리팩토링 (Week 1, Day 4-5)

### Step 2.1: Sidebar.tsx 전면 교체

**파일**: `apps/frontend-next/src/components/Sidebar.tsx`

기존 파일을 백업 후 아래 내용으로 교체:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import { useService } from '@/contexts/ServiceContext';
import { ServiceSelector } from '@/components/ui/ServiceSelector';
import { systemMenus, MenuConfig } from '@/config/services.config';

export default function Sidebar() {
  const pathname = usePathname();
  const { currentService } = useService();

  const serviceMenus = currentService?.menus ?? [];

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname.startsWith(href);
  };

  const renderMenuItem = (menu: MenuConfig, baseHref: string) => {
    const fullHref = `${baseHref}/${menu.href}`;
    const Icon = menu.icon;

    return (
      <div key={menu.id}>
        <Link
          href={fullHref}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm ${
            isActive(fullHref)
              ? 'bg-blue-50 text-blue-600 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Icon className="w-5 h-5" />
          {menu.label}
        </Link>

        {menu.subMenus && isActive(fullHref) && (
          <div className="ml-6 mt-1 space-y-1">
            {menu.subMenus.map((subMenu) => (
              <Link
                key={subMenu.id}
                href={`${baseHref}/${subMenu.href}`}
                className={`block px-4 py-2 text-xs rounded-lg ${
                  isActive(`${baseHref}/${subMenu.href}`)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {subMenu.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* 로고 */}
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">OLA B2B</h1>
      </div>

      {/* 서비스 선택 */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          서비스 선택
        </div>
        <ServiceSelector />
      </div>

      {/* 동적 서비스 메뉴 */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {currentService && (
          <div className="space-y-1">
            {serviceMenus.map((menu) =>
              renderMenuItem(menu, `/dashboard/${currentService.id}`)
            )}
          </div>
        )}

        {!currentService && (
          <div className="text-center py-8 text-gray-400 text-sm">
            서비스를 선택해주세요
          </div>
        )}

        {/* 시스템 관리 섹션 */}
        <div className="pt-4 mt-4 border-t border-gray-100">
          <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Settings className="w-3 h-3" />
            시스템 관리
          </div>
          {systemMenus.map((menu) => {
            const Icon = menu.icon;
            return (
              <Link
                key={menu.id}
                href={menu.href}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm ${
                  isActive(menu.href)
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {menu.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* API 상태 */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          API 연결됨
        </div>
      </div>
    </aside>
  );
}
```

### Step 2.2: Phase 2 완료 체크

- [ ] `Sidebar.tsx` 교체 완료
- [ ] 사이드바에 서비스 드롭다운 표시 확인
- [ ] 드롭다운 클릭 시 서비스 목록 표시 확인
- [ ] 서비스 선택 없을 때 "서비스를 선택해주세요" 표시 확인
- [ ] 시스템 관리 섹션 항상 표시 확인

---

## 5. Phase 3: 라우팅 재구성 (Week 2)

### Step 3.1: [serviceId] 동적 라우트 레이아웃 생성

**파일**: `apps/frontend-next/src/app/dashboard/[serviceId]/layout.tsx`

```typescript
import { notFound } from 'next/navigation';
import { SERVICE_IDS } from '@/config/services.config';

interface ServiceLayoutProps {
  children: React.ReactNode;
  params: { serviceId: string };
}

export default function ServiceLayout({ children, params }: ServiceLayoutProps) {
  if (!SERVICE_IDS.includes(params.serviceId)) {
    notFound();
  }

  return <>{children}</>;
}

export function generateStaticParams() {
  return SERVICE_IDS.map((serviceId) => ({ serviceId }));
}
```

### Step 3.2: 페이지 이동 - IBK Chat (14개)

각 페이지를 새 경로로 이동하고, `router.push` 하드코딩 수정

#### 3.2.1 operations 페이지

```bash
# 디렉토리 생성 및 파일 이동
mkdir -p apps/frontend-next/src/app/dashboard/[serviceId]/operations
mv apps/frontend-next/src/app/dashboard/operations/page.tsx \
   apps/frontend-next/src/app/dashboard/[serviceId]/operations/page.tsx
```

#### 3.2.2 ai-performance 페이지

```bash
mkdir -p apps/frontend-next/src/app/dashboard/[serviceId]/ai-performance
mv apps/frontend-next/src/app/dashboard/ai-performance/page.tsx \
   apps/frontend-next/src/app/dashboard/[serviceId]/ai-performance/page.tsx
```

#### 3.2.3 quality 페이지

```bash
mkdir -p apps/frontend-next/src/app/dashboard/[serviceId]/quality
mv apps/frontend-next/src/app/dashboard/quality/page.tsx \
   apps/frontend-next/src/app/dashboard/[serviceId]/quality/page.tsx
```

#### 3.2.4 chatbot-quality 페이지

```bash
mkdir -p apps/frontend-next/src/app/dashboard/[serviceId]/chatbot-quality
mv apps/frontend-next/src/app/dashboard/chatbot-quality/page.tsx \
   apps/frontend-next/src/app/dashboard/[serviceId]/chatbot-quality/page.tsx
```

#### 3.2.5 user-analytics 페이지 (하위 포함)

```bash
mkdir -p apps/frontend-next/src/app/dashboard/[serviceId]/user-analytics
mv apps/frontend-next/src/app/dashboard/user-analytics/* \
   apps/frontend-next/src/app/dashboard/[serviceId]/user-analytics/
```

**중요! `[userId]/page.tsx` 수정** (라인 65):

```typescript
// 파일 상단에 추가
import { useParams } from 'next/navigation';

// 컴포넌트 내부에 추가
const params = useParams();
const serviceId = (params?.serviceId as string) || 'ibk-chat';

// 라인 65 수정
const handleBack = () => {
  router.push(`/dashboard/${serviceId}/user-analytics`);  // 수정
};
```

#### 3.2.6 batch-analysis 페이지 (하위 포함)

```bash
mkdir -p apps/frontend-next/src/app/dashboard/[serviceId]/batch-analysis
mv apps/frontend-next/src/app/dashboard/admin/batch-analysis/* \
   apps/frontend-next/src/app/dashboard/[serviceId]/batch-analysis/
```

**수정해야 할 파일들**:

| 파일 | 라인 | 수정 전 | 수정 후 |
|------|------|---------|---------|
| `page.tsx` | 77 | `'/dashboard/admin/batch-analysis/prompts'` | `` `/dashboard/${serviceId}/batch-analysis/prompts` `` |
| `page.tsx` | 89 | `'/dashboard/admin/batch-analysis/schedules'` | `` `/dashboard/${serviceId}/batch-analysis/schedules` `` |
| `[id]/page.tsx` | 211 | `'/dashboard/admin/batch-analysis'` | `` `/dashboard/${serviceId}/batch-analysis` `` |
| `prompts/page.tsx` | 155 | `'/dashboard/admin/batch-analysis'` | `` `/dashboard/${serviceId}/batch-analysis` `` |
| `schedules/page.tsx` | 211 | `'/dashboard/admin/batch-analysis'` | `` `/dashboard/${serviceId}/batch-analysis` `` |
| `faq/[id]/page.tsx` | 143 | `'/dashboard/admin/batch-analysis'` | `` `/dashboard/${serviceId}/batch-analysis` `` |

각 파일에 추가:
```typescript
import { useParams } from 'next/navigation';
// ...
const params = useParams();
const serviceId = (params?.serviceId as string) || 'ibk-chat';
```

#### 3.2.7 problematic-rules 페이지

```bash
mkdir -p apps/frontend-next/src/app/dashboard/[serviceId]/problematic-rules
mv apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx \
   apps/frontend-next/src/app/dashboard/[serviceId]/problematic-rules/page.tsx
```

#### 3.2.8 business 페이지

```bash
mkdir -p apps/frontend-next/src/app/dashboard/[serviceId]/business
mv apps/frontend-next/src/app/dashboard/business/page.tsx \
   apps/frontend-next/src/app/dashboard/[serviceId]/business/page.tsx
```

### Step 3.3: ETL 페이지 이동 (2개)

#### Wind ETL

```bash
mkdir -p apps/frontend-next/src/app/dashboard/[serviceId]/status
# Wind ETL 페이지 복사 (공유 status 페이지로)
cp apps/frontend-next/src/app/dashboard/etl/wind/page.tsx \
   apps/frontend-next/src/app/dashboard/[serviceId]/status/page.tsx
```

#### Minkabu ETL

Wind와 동일한 status 페이지 사용 (서비스 ID로 구분)

### Step 3.4: Report 페이지 이동 (1개)

```bash
# IBK Report도 status 페이지 사용
# 또는 별도 페이지 필요시:
cp apps/frontend-next/src/app/dashboard/report-monitoring/page.tsx \
   apps/frontend-next/src/app/dashboard/[serviceId]/status/page.tsx
```

### Step 3.5: 페이지 이동 체크리스트

- [ ] operations 이동 완료
- [ ] ai-performance 이동 완료
- [ ] quality 이동 완료
- [ ] chatbot-quality 이동 완료
- [ ] user-analytics 이동 완료 + `[userId]` 하드코딩 수정
- [ ] batch-analysis 이동 완료 + 6개 파일 하드코딩 수정
- [ ] problematic-rules 이동 완료
- [ ] business 이동 완료
- [ ] ETL status 페이지 생성
- [ ] 각 페이지 접근 테스트

---

## 6. Phase 4: 미들웨어 및 정리 (Week 3, Day 1-2)

### Step 4.1: middleware.ts 수정

**파일**: `apps/frontend-next/src/middleware.ts`

기존 파일에 리다이렉트 로직 추가:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login'];

const IGNORED_ROUTES = [
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// URL 리다이렉트 매핑
const STATIC_REDIRECTS: Record<string, string> = {
  '/dashboard/operations': '/dashboard/ibk-chat/operations',
  '/dashboard/ai-performance': '/dashboard/ibk-chat/ai-performance',
  '/dashboard/quality': '/dashboard/ibk-chat/quality',
  '/dashboard/chatbot-quality': '/dashboard/ibk-chat/chatbot-quality',
  '/dashboard/user-analytics': '/dashboard/ibk-chat/user-analytics',
  '/dashboard/business': '/dashboard/ibk-chat/business',
  '/dashboard/admin/batch-analysis': '/dashboard/ibk-chat/batch-analysis',
  '/dashboard/admin/batch-analysis/schedules': '/dashboard/ibk-chat/batch-analysis/schedules',
  '/dashboard/admin/batch-analysis/prompts': '/dashboard/ibk-chat/batch-analysis/prompts',
  '/dashboard/admin/batch-analysis/issue-frequency': '/dashboard/ibk-chat/batch-analysis/issue-frequency',
  '/dashboard/admin/problematic-rules': '/dashboard/ibk-chat/problematic-rules',
  '/dashboard/etl/wind': '/dashboard/wind-etl/status',
  '/dashboard/etl/minkabu': '/dashboard/minkabu-etl/status',
  '/dashboard/report-monitoring': '/dashboard/ibk-report/status',
  '/dashboard/analysis': '/dashboard/admin/analysis',
};

const DYNAMIC_REDIRECTS = [
  { pattern: /^\/dashboard\/user-analytics\/(.+)$/, replacement: '/dashboard/ibk-chat/user-analytics/$1' },
  { pattern: /^\/dashboard\/admin\/batch-analysis\/([^\/\?]+)$/, replacement: '/dashboard/ibk-chat/batch-analysis/$1' },
  { pattern: /^\/dashboard\/admin\/batch-analysis\/faq\/(.+)$/, replacement: '/dashboard/ibk-chat/batch-analysis/faq/$1' },
];

function getRedirectUrl(pathname: string, search: string): string | null {
  let newPath: string | null = null;

  if (STATIC_REDIRECTS[pathname]) {
    newPath = STATIC_REDIRECTS[pathname];
  }

  if (!newPath) {
    for (const { pattern, replacement } of DYNAMIC_REDIRECTS) {
      if (pattern.test(pathname)) {
        newPath = pathname.replace(pattern, replacement);
        break;
      }
    }
  }

  if (newPath && search) {
    return `${newPath}${search}`;
  }

  return newPath;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 루트 리다이렉트
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 무시할 경로
  if (IGNORED_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // URL 리다이렉트
  const redirectUrl = getRedirectUrl(pathname, search);
  if (redirectUrl) {
    return NextResponse.redirect(new URL(redirectUrl, request.url), 301);
  }

  // 인증 체크
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const hasRefreshToken = request.cookies.has('refreshToken');

  if (!isPublicRoute && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute && hasRefreshToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)'],
};
```

### Step 4.2: 기존 디렉토리 삭제

```bash
# 이동 완료 후 기존 디렉토리 삭제
rm -rf apps/frontend-next/src/app/dashboard/operations
rm -rf apps/frontend-next/src/app/dashboard/ai-performance
rm -rf apps/frontend-next/src/app/dashboard/quality
rm -rf apps/frontend-next/src/app/dashboard/chatbot-quality
rm -rf apps/frontend-next/src/app/dashboard/user-analytics
rm -rf apps/frontend-next/src/app/dashboard/business
rm -rf apps/frontend-next/src/app/dashboard/etl
rm -rf apps/frontend-next/src/app/dashboard/report-monitoring
rm -rf apps/frontend-next/src/app/dashboard/analysis  # 중복 페이지

# admin/batch-analysis, admin/problematic-rules는 이동했으므로 삭제
rm -rf apps/frontend-next/src/app/dashboard/admin/batch-analysis
rm -rf apps/frontend-next/src/app/dashboard/admin/problematic-rules
```

### Step 4.3: Phase 4 완료 체크

- [ ] middleware.ts 리다이렉트 로직 추가 완료
- [ ] 기존 디렉토리 삭제 완료
- [ ] `/dashboard/quality` 접근 시 `/dashboard/ibk-chat/quality`로 리다이렉트 확인
- [ ] 쿼리 파라미터 보존 확인

---

## 7. Phase 5: 마무리 (Week 3-4)

### Step 5.1: 각 페이지에 PageGuide 추가

모든 서비스 페이지 상단에 PageGuide 추가:

```typescript
import { PageGuide } from '@/components/ui/PageGuide';

export default function QualityPage() {
  return (
    <div className="p-8">
      <PageGuide
        title="품질 분석"
        description="챗봇 응답의 정확도와 사용자 만족도 지표를 모니터링합니다."
      />
      {/* 기존 내용 */}
    </div>
  );
}
```

### Step 5.2: 대시보드 홈 서비스 선택 UI

**파일**: `apps/frontend-next/src/app/dashboard/page.tsx`

```typescript
'use client';

import { useService } from '@/contexts/ServiceContext';
import { useRouter } from 'next/navigation';

export default function DashboardHomePage() {
  const { services } = useService();
  const router = useRouter();

  const handleServiceClick = (serviceId: string, firstMenuHref: string) => {
    router.push(`/dashboard/${serviceId}/${firstMenuHref}`);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">서비스 선택</h1>
      <p className="text-gray-500 mb-8">모니터링할 서비스를 선택해주세요.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => handleServiceClick(service.id, service.menus[0]?.href || '')}
            className="p-6 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all text-left"
          >
            <div className="text-4xl mb-4">{service.emoji}</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{service.name}</h2>
            <p className="text-sm text-gray-500">{service.description}</p>
            <div className="mt-4 text-xs text-gray-400">
              {service.menus.length}개 메뉴
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Step 5.3: 커밋

```bash
git add .
git commit -m "feat: 네비게이션 UX 개선 - 서비스 드롭다운 + 동적 메뉴

- 서비스 선택 드롭다운 구현
- URL 구조 변경 (/dashboard/{serviceId}/...)
- 기존 URL 301 리다이렉트
- 모든 메뉴 한국어 통일
- 각 페이지에 PageGuide 추가

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## 8. 테스트 체크리스트

### 8.1 기능 테스트

- [ ] 서비스 드롭다운에서 4개 서비스 모두 선택 가능
- [ ] IBK Chat 선택 시 8개 메뉴 표시
- [ ] Wind ETL 선택 시 1개 메뉴(ETL 상태) 표시
- [ ] `/dashboard/ibk-chat/quality` 접근 정상
- [ ] `/dashboard/quality` → `/dashboard/ibk-chat/quality` 301 리다이렉트
- [ ] `/dashboard/user-analytics/user123` → `/dashboard/ibk-chat/user-analytics/user123` 리다이렉트
- [ ] 새로고침 시 서비스 상태 유지
- [ ] 인증 없이 접근 시 로그인 페이지로 리다이렉트
- [ ] 로그인 상태에서 `/login` 접근 시 `/dashboard`로 리다이렉트

### 8.2 UI/UX 테스트

- [ ] 모든 메뉴 레이블 한국어
- [ ] 모든 페이지에 PageGuide 표시
- [ ] 현재 메뉴 파란색 하이라이트
- [ ] 드롭다운 열기/닫기 애니메이션

### 8.3 호환성 테스트

- [ ] Chrome 정상
- [ ] Firefox 정상
- [ ] 기존 북마크 URL 정상 리다이렉트

---

## 9. 롤백 가이드

### 9.1 전체 롤백

```bash
git checkout dev
git branch -D feature/navigation-ux-improvement
```

### 9.2 특정 Phase 롤백

각 Phase 완료 시 태그를 생성해두면 부분 롤백 가능:

```bash
# Phase 완료 시 태그 생성
git tag nav-ux-phase-1
git tag nav-ux-phase-2
# ...

# 특정 Phase로 롤백
git checkout nav-ux-phase-1
```

---

## 부록: 파일 변경 요약

### 신규 생성 (6개)
- `src/config/services.config.ts`
- `src/contexts/ServiceContext.tsx`
- `src/components/ui/PageGuide.tsx`
- `src/components/ui/ServiceSelector.tsx`
- `src/app/dashboard/[serviceId]/layout.tsx`
- `src/app/dashboard/[serviceId]/*/page.tsx` (이동된 파일들)

### 수정 (3개)
- `src/app/providers.tsx` - ServiceProvider 추가
- `src/components/Sidebar.tsx` - 전면 교체
- `src/middleware.ts` - 리다이렉트 로직 추가

### 삭제 (이동 후)
- `src/app/dashboard/operations/`
- `src/app/dashboard/ai-performance/`
- `src/app/dashboard/quality/`
- `src/app/dashboard/chatbot-quality/`
- `src/app/dashboard/user-analytics/`
- `src/app/dashboard/business/`
- `src/app/dashboard/etl/`
- `src/app/dashboard/report-monitoring/`
- `src/app/dashboard/analysis/`
- `src/app/dashboard/admin/batch-analysis/`
- `src/app/dashboard/admin/problematic-rules/`

---

*이 가이드는 `.sisyphus/plans/navigation-ux-improvement.md` 계획서를 기반으로 작성되었습니다.*
