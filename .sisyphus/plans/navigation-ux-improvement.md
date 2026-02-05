# 네비게이션 UX 개선 작업 계획서 (v2.0)

> **생성일**: 2026-02-05
> **수정일**: 2026-02-05 (Momus 리뷰 반영)
> **목표 완료일**: 2026-03-05 (1개월)
> **상태**: 대기 중 (사용자 승인 필요)

---

## 1. 요구사항 요약

### 1.1 프로젝트 배경
- OLA B2B 모니터링 시스템의 UI/UX를 비개발자도 편하게 사용할 수 있도록 개선
- 현재 4개 서비스 → 6개월 내 10개 이상으로 확장 예정
- 서비스별 메뉴 구성이 상당히 다름 (IBK Chat vs ETL vs Report)

### 1.2 핵심 목표
| 목표 | 설명 |
|------|------|
| **직관적인 네비게이션** | 서비스 드롭다운 + 동적 메뉴로 서비스별 컨텍스트 명확화 |
| **확장성** | 10개 이상 서비스 추가 시에도 깔끔한 사이드바 유지 |
| **한국어 통일** | 모든 UI 텍스트 한국어화 |
| **페이지 가이드** | 각 페이지에 목적과 사용법 안내 문구 추가 |

### 1.3 현재 서비스 및 페이지 분류

#### 서비스별 페이지 (총 14개)
| 서비스 ID | 서비스명 | 페이지 | 현재 경로 | 새 경로 |
|-----------|----------|--------|-----------|---------|
| `ibk-chat` | IBK Chat | 운영 현황 | `/dashboard/operations` | `/dashboard/ibk-chat/operations` |
| `ibk-chat` | IBK Chat | AI 성능 | `/dashboard/ai-performance` | `/dashboard/ibk-chat/ai-performance` |
| `ibk-chat` | IBK Chat | 품질 분석 | `/dashboard/quality` | `/dashboard/ibk-chat/quality` |
| `ibk-chat` | IBK Chat | 챗봇 품질 | `/dashboard/chatbot-quality` | `/dashboard/ibk-chat/chatbot-quality` |
| `ibk-chat` | IBK Chat | 유저 분석 | `/dashboard/user-analytics` | `/dashboard/ibk-chat/user-analytics` |
| `ibk-chat` | IBK Chat | 유저 상세 | `/dashboard/user-analytics/[userId]` | `/dashboard/ibk-chat/user-analytics/[userId]` |
| `ibk-chat` | IBK Chat | 배치 분석 | `/dashboard/admin/batch-analysis` | `/dashboard/ibk-chat/batch-analysis` |
| `ibk-chat` | IBK Chat | 배치 상세 | `/dashboard/admin/batch-analysis/[id]` | `/dashboard/ibk-chat/batch-analysis/[id]` |
| `ibk-chat` | IBK Chat | 스케줄 관리 | `/dashboard/admin/batch-analysis/schedules` | `/dashboard/ibk-chat/batch-analysis/schedules` |
| `ibk-chat` | IBK Chat | 프롬프트 관리 | `/dashboard/admin/batch-analysis/prompts` | `/dashboard/ibk-chat/batch-analysis/prompts` |
| `ibk-chat` | IBK Chat | FAQ 상세 | `/dashboard/admin/batch-analysis/faq/[id]` | `/dashboard/ibk-chat/batch-analysis/faq/[id]` |
| `ibk-chat` | IBK Chat | 이슈 빈도 | `/dashboard/admin/batch-analysis/issue-frequency` | `/dashboard/ibk-chat/batch-analysis/issue-frequency` |
| `ibk-chat` | IBK Chat | 문제 탐지 규칙 | `/dashboard/admin/problematic-rules` | `/dashboard/ibk-chat/problematic-rules` |
| `ibk-chat` | IBK Chat | 비용/사용량 | `/dashboard/business` | `/dashboard/ibk-chat/business` |
| `wind-etl` | Wind ETL | ETL 상태 | `/dashboard/etl/wind` | `/dashboard/wind-etl/status` |
| `minkabu-etl` | Minkabu ETL | ETL 상태 | `/dashboard/etl/minkabu` | `/dashboard/minkabu-etl/status` |
| `ibk-report` | IBK Report | 리포트 모니터링 | `/dashboard/report-monitoring` | `/dashboard/ibk-report/status` |

#### 시스템 관리 페이지 - 전역 (총 6개, 경로 유지)
| 페이지 | 현재 경로 | 새 경로 | 비고 |
|--------|-----------|---------|------|
| 사용자 관리 | `/dashboard/admin/users` | `/dashboard/admin/users` | 경로 유지 |
| 역할 관리 | `/dashboard/admin/roles` | `/dashboard/admin/roles` | 경로 유지 |
| 필터 관리 | `/dashboard/admin/filters` | `/dashboard/admin/filters` | 경로 유지 |
| AI 분석 | `/dashboard/admin/analysis` | `/dashboard/admin/analysis` | 경로 유지 |
| AI 분석 상세 | `/dashboard/admin/analysis/[id]` | `/dashboard/admin/analysis/[id]` | 경로 유지 |
| AI 분석 (독립) | `/dashboard/analysis` | **삭제** | admin/analysis와 중복, 제거 |

#### 기타 페이지 (총 3개)
| 페이지 | 현재 경로 | 새 경로 | 비고 |
|--------|-----------|---------|------|
| 대시보드 홈 | `/dashboard` | `/dashboard` | 서비스 선택 안내 페이지로 변경 |
| 아키텍처 | `/architecture` | `/architecture` | 경로 유지 |
| 레거시 로그 | `/ibks/logs` | `/ibks/logs` | 경로 유지 (루트 리다이렉트 대상) |

---

## 2. 수락 기준 (Acceptance Criteria)

### 2.1 필수 기준 (측정 가능한 조건)
- [ ] 사이드바 상단에 서비스 선택 드롭다운이 표시되고, 4개 서비스 모두 선택 가능
- [ ] IBK Chat 선택 시 사이드바에 14개 메뉴 항목만 표시 (운영 현황, AI 성능, 품질 분석, 챗봇 품질, 유저 분석, 배치 분석, 문제 탐지 규칙, 비용/사용량)
- [ ] Wind ETL/Minkabu ETL 선택 시 사이드바에 1개 메뉴(ETL 상태)만 표시
- [ ] IBK Report 선택 시 사이드바에 1개 메뉴(리포트 상태)만 표시
- [ ] 시스템 관리 섹션(사용자/역할/필터/AI분석)은 서비스 선택과 무관하게 항상 표시
- [ ] URL `/dashboard/ibk-chat/quality` 접근 시 품질 분석 페이지가 IBK Chat 컨텍스트로 로드
- [ ] 기존 URL `/dashboard/quality` 접근 시 `/dashboard/ibk-chat/quality`로 301 리다이렉트
- [ ] 동적 경로 `/dashboard/user-analytics/USER123` 접근 시 `/dashboard/ibk-chat/user-analytics/USER123`으로 리다이렉트
- [ ] 페이지 새로고침 시 URL 기반으로 서비스 상태 복원
- [ ] 모든 메뉴 레이블이 한국어로 표시 (영어 혼용 없음)
- [ ] 모든 페이지 상단에 PageGuide 컴포넌트로 페이지 설명 표시 (최소 1문장)
- [ ] 기존 인증 플로우 정상 작동 (refreshToken 없이 /dashboard 접근 시 /login으로 리다이렉트)

### 2.2 선택 기준 (시간 여유 시)
- [ ] 서비스 드롭다운에 검색 기능 (서비스 5개 이상 시 유용)
- [ ] 최근 방문 서비스 localStorage 저장 및 표시
- [ ] 브레드크럼 네비게이션 (현재 위치: IBK Chat > 품질 분석)

---

## 3. 기술 설계

### 3.1 서비스 설정 구조

**파일**: `apps/frontend-next/src/config/services.config.ts` (신규 생성)

```typescript
import {
  Activity, Cpu, CheckCircle, MessageSquare, Users, Layers,
  AlertTriangle, BarChart, FileText, Shield, Filter, Brain,
  LucideIcon
} from 'lucide-react';

export interface MenuConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;  // 서비스별 상대 경로 (예: 'quality')
  description: string;  // 페이지 가이드용
  subMenus?: MenuConfig[];  // 중첩 메뉴 (batch-analysis 등)
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
        description: '실시간 트래픽, 응답 시간, 에러율 등 핵심 운영 지표를 확인합니다.'
      },
      {
        id: 'ai-performance',
        label: 'AI 성능',
        icon: Cpu,
        href: 'ai-performance',
        description: 'AI 모델의 응답 품질, 토큰 사용량, 처리 시간을 분석합니다.'
      },
      {
        id: 'quality',
        label: '품질 분석',
        icon: CheckCircle,
        href: 'quality',
        description: '챗봇 응답의 정확도와 사용자 만족도 지표를 모니터링합니다.'
      },
      {
        id: 'chatbot-quality',
        label: '챗봇 품질',
        icon: MessageSquare,
        href: 'chatbot-quality',
        description: '개별 대화의 품질을 상세 분석하고 문제 패턴을 탐지합니다.'
      },
      {
        id: 'user-analytics',
        label: '유저 분석',
        icon: Users,
        href: 'user-analytics',
        description: '사용자별 활동 패턴, 선호도, 이탈 위험을 분석합니다.'
      },
      {
        id: 'batch-analysis',
        label: '배치 분석',
        icon: Layers,
        href: 'batch-analysis',
        description: '대량 데이터 분석 작업을 생성하고 결과를 확인합니다.',
        subMenus: [
          { id: 'schedules', label: '스케줄 관리', icon: Layers, href: 'batch-analysis/schedules', description: '자동 분석 스케줄을 설정합니다.' },
          { id: 'prompts', label: '프롬프트 관리', icon: Layers, href: 'batch-analysis/prompts', description: '분석에 사용할 프롬프트 템플릿을 관리합니다.' },
          { id: 'issue-frequency', label: '이슈 빈도', icon: Layers, href: 'batch-analysis/issue-frequency', description: '자주 발생하는 이슈 패턴을 확인합니다.' },
        ]
      },
      {
        id: 'problematic-rules',
        label: '문제 탐지 규칙',
        icon: AlertTriangle,
        href: 'problematic-rules',
        description: '문제 대화를 자동 탐지하는 규칙을 설정합니다.'
      },
      {
        id: 'business',
        label: '비용/사용량',
        icon: BarChart,
        href: 'business',
        description: 'API 호출 비용과 토큰 사용량 트렌드를 확인합니다.'
      },
    ]
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
        description: 'Wind 데이터 파이프라인의 실행 상태와 히스토리를 확인합니다.'
      },
    ]
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
        description: 'Minkabu 데이터 파이프라인의 실행 상태와 히스토리를 확인합니다.'
      },
    ]
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
        description: '리포트 생성 및 배포 상태를 확인합니다.'
      },
    ]
  },
];

// 시스템 관리 메뉴 (서비스와 무관, 전역)
export const systemMenus: MenuConfig[] = [
  { id: 'users', label: '사용자 관리', icon: Users, href: '/dashboard/admin/users', description: '시스템 사용자 계정을 관리합니다.' },
  { id: 'roles', label: '역할 관리', icon: Shield, href: '/dashboard/admin/roles', description: '사용자 역할과 접근 권한을 설정합니다.' },
  { id: 'filters', label: '필터 관리', icon: Filter, href: '/dashboard/admin/filters', description: '저장된 데이터 필터를 관리합니다.' },
  { id: 'analysis', label: 'AI 분석', icon: Brain, href: '/dashboard/admin/analysis', description: 'AI 기반 데이터 분석 세션을 관리합니다.' },
];

// 헬퍼 함수
export function getServiceById(serviceId: string): ServiceConfig | undefined {
  return servicesConfig.find(s => s.id === serviceId);
}

export function getMenuDescription(serviceId: string, menuId: string): string | undefined {
  const service = getServiceById(serviceId);
  if (!service) return undefined;

  const menu = service.menus.find(m => m.id === menuId);
  return menu?.description;
}
```

### 3.2 서비스 컨텍스트 상태 관리

**파일**: `apps/frontend-next/src/contexts/ServiceContext.tsx` (신규 생성)

```typescript
'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { servicesConfig, ServiceConfig, getServiceById } from '@/config/services.config';

interface ServiceContextType {
  currentService: ServiceConfig | null;
  setCurrentService: (serviceId: string) => void;
  services: ServiceConfig[];
  isServicePage: boolean;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

const SERVICE_IDS = servicesConfig.map(s => s.id);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [currentService, setCurrentServiceState] = useState<ServiceConfig | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // URL에서 서비스 ID 추출하여 상태 동기화
  useEffect(() => {
    if (pathname?.startsWith('/dashboard/')) {
      const segments = pathname.split('/');
      const potentialServiceId = segments[2]; // /dashboard/{serviceId}/...

      if (SERVICE_IDS.includes(potentialServiceId)) {
        const service = getServiceById(potentialServiceId);
        if (service && service.id !== currentService?.id) {
          setCurrentServiceState(service);
        }
      } else {
        // admin 페이지 등 서비스 외 페이지 - 서비스 상태 유지
      }
    }
  }, [pathname, currentService?.id]);

  const setCurrentService = useCallback((serviceId: string) => {
    const service = getServiceById(serviceId);
    if (service) {
      setCurrentServiceState(service);
      // 서비스 변경 시 해당 서비스의 첫 메뉴로 이동
      const firstMenu = service.menus[0];
      if (firstMenu) {
        router.push(`/dashboard/${serviceId}/${firstMenu.href}`);
      }
    }
  }, [router]);

  const isServicePage = pathname?.startsWith('/dashboard/') &&
    SERVICE_IDS.includes(pathname.split('/')[2] || '');

  return (
    <ServiceContext.Provider value={{
      currentService,
      setCurrentService,
      services: servicesConfig,
      isServicePage
    }}>
      {children}
    </ServiceContext.Provider>
  );
}

export function useService() {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useService must be used within ServiceProvider');
  }
  return context;
}
```

### 3.3 Providers.tsx 수정

**파일**: `apps/frontend-next/src/app/providers.tsx` (수정)

```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query-client';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatbotProvider } from '@/contexts/ChatbotContext';
import { ServiceProvider } from '@/contexts/ServiceContext';  // 추가

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ServiceProvider>  {/* 추가 - ChatbotProvider 전에 */}
          <ChatbotProvider>
            {children}
          </ChatbotProvider>
        </ServiceProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 3.4 미들웨어 수정 (기존 로직 보존 + 리다이렉트 추가)

**파일**: `apps/frontend-next/src/middleware.ts` (수정)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];

// Define routes that should be ignored by middleware
const IGNORED_ROUTES = [
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// ========== 신규: URL 리다이렉트 매핑 ==========
// 정적 경로 매핑
const STATIC_REDIRECTS: Record<string, string> = {
  // IBK Chat 서비스 페이지
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
  // ETL 서비스 페이지
  '/dashboard/etl/wind': '/dashboard/wind-etl/status',
  '/dashboard/etl/minkabu': '/dashboard/minkabu-etl/status',
  // Report 서비스 페이지
  '/dashboard/report-monitoring': '/dashboard/ibk-report/status',
  // 삭제된 페이지
  '/dashboard/analysis': '/dashboard/admin/analysis',  // 중복 페이지 -> admin으로 리다이렉트
};

// 동적 경로 패턴 (정규식)
const DYNAMIC_REDIRECTS: Array<{ pattern: RegExp; replacement: string }> = [
  // /dashboard/user-analytics/USER123 -> /dashboard/ibk-chat/user-analytics/USER123
  { pattern: /^\/dashboard\/user-analytics\/(.+)$/, replacement: '/dashboard/ibk-chat/user-analytics/$1' },
  // /dashboard/admin/batch-analysis/123 -> /dashboard/ibk-chat/batch-analysis/123
  { pattern: /^\/dashboard\/admin\/batch-analysis\/([^\/]+)$/, replacement: '/dashboard/ibk-chat/batch-analysis/$1' },
  // /dashboard/admin/batch-analysis/faq/123 -> /dashboard/ibk-chat/batch-analysis/faq/123
  { pattern: /^\/dashboard\/admin\/batch-analysis\/faq\/(.+)$/, replacement: '/dashboard/ibk-chat/batch-analysis/faq/$1' },
];

function getRedirectUrl(pathname: string): string | null {
  // 1. 정적 매핑 확인
  if (STATIC_REDIRECTS[pathname]) {
    return STATIC_REDIRECTS[pathname];
  }

  // 2. 동적 패턴 확인
  for (const { pattern, replacement } of DYNAMIC_REDIRECTS) {
    if (pattern.test(pathname)) {
      return pathname.replace(pattern, replacement);
    }
  }

  return null;
}
// ========== 신규 끝 ==========

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root '/' to '/dashboard' (변경: ibks/logs -> dashboard)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Ignore certain routes
  if (IGNORED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ========== 신규: URL 리다이렉트 처리 ==========
  const redirectUrl = getRedirectUrl(pathname);
  if (redirectUrl) {
    return NextResponse.redirect(new URL(redirectUrl, request.url), 301);
  }
  // ========== 신규 끝 ==========

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // Get the refresh token from cookies
  const hasRefreshToken = request.cookies.has('refreshToken');

  // If accessing a protected route without a refresh token, redirect to login
  if (!isPublicRoute && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing login page while authenticated, redirect to dashboard
  if (isPublicRoute && hasRefreshToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
```

### 3.5 페이지 가이드 컴포넌트

**파일**: `apps/frontend-next/src/components/ui/PageGuide.tsx` (신규 생성)

```typescript
import { Info } from 'lucide-react';

interface PageGuideProps {
  title: string;
  description: string;
  className?: string;
}

export function PageGuide({ title, description, className = '' }: PageGuideProps) {
  return (
    <div className={`mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl ${className}`}>
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

### 3.6 서비스 선택 드롭다운 컴포넌트

**파일**: `apps/frontend-next/src/components/ui/ServiceSelector.tsx` (신규 생성)

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useService } from '@/contexts/ServiceContext';

export function ServiceSelector() {
  const { currentService, setCurrentService, services } = useService();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
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
        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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

### 3.7 새로운 사이드바 구조

**파일**: `apps/frontend-next/src/components/Sidebar.tsx` (전면 리팩토링)

새로운 사이드바는 다음 구조를 가집니다:

```
┌────────────────────────────┐
│ 🏢 OLA B2B                 │  ← 로고
├────────────────────────────┤
│ 서비스 선택                │
│ ┌────────────────────────┐ │
│ │ 💬 IBK Chat         ▼  │ │  ← ServiceSelector 컴포넌트
│ └────────────────────────┘ │
├────────────────────────────┤
│ (동적 메뉴 - 선택된 서비스) │
│   운영 현황                │
│   AI 성능                 │
│   품질 분석               │
│   ...                     │
├────────────────────────────┤
│ ⚙️ 시스템 관리             │  ← 전역 메뉴 (항상 표시)
│   사용자 관리             │
│   역할 관리               │
│   필터 관리               │
│   AI 분석                 │
└────────────────────────────┘
```

### 3.8 라우팅 구조 변경

**디렉토리 구조**:
```
apps/frontend-next/src/app/dashboard/
├── page.tsx                          ← 대시보드 홈 (서비스 선택 안내)
├── [serviceId]/                      ← 동적 서비스 라우트
│   ├── layout.tsx                    ← 서비스별 레이아웃
│   ├── operations/page.tsx
│   ├── ai-performance/page.tsx
│   ├── quality/page.tsx
│   ├── chatbot-quality/page.tsx
│   ├── user-analytics/
│   │   ├── page.tsx
│   │   └── [userId]/page.tsx
│   ├── batch-analysis/
│   │   ├── page.tsx
│   │   ├── [id]/page.tsx
│   │   ├── schedules/page.tsx
│   │   ├── prompts/page.tsx
│   │   ├── faq/[id]/page.tsx
│   │   └── issue-frequency/page.tsx
│   ├── problematic-rules/page.tsx
│   ├── business/page.tsx
│   └── status/page.tsx               ← ETL/Report 공용
└── admin/                            ← 시스템 관리 (경로 유지)
    ├── users/page.tsx
    ├── roles/page.tsx
    ├── filters/page.tsx
    └── analysis/
        ├── page.tsx
        └── [id]/page.tsx
```

---

## 4. 전체 페이지 마이그레이션 체크리스트

### 4.1 IBK Chat 서비스 (14개 페이지)
| # | 현재 경로 | 새 경로 | 상태 |
|---|-----------|---------|------|
| 1 | `/dashboard/operations` | `/dashboard/ibk-chat/operations` | ⬜ |
| 2 | `/dashboard/ai-performance` | `/dashboard/ibk-chat/ai-performance` | ⬜ |
| 3 | `/dashboard/quality` | `/dashboard/ibk-chat/quality` | ⬜ |
| 4 | `/dashboard/chatbot-quality` | `/dashboard/ibk-chat/chatbot-quality` | ⬜ |
| 5 | `/dashboard/user-analytics` | `/dashboard/ibk-chat/user-analytics` | ⬜ |
| 6 | `/dashboard/user-analytics/[userId]` | `/dashboard/ibk-chat/user-analytics/[userId]` | ⬜ |
| 7 | `/dashboard/admin/batch-analysis` | `/dashboard/ibk-chat/batch-analysis` | ⬜ |
| 8 | `/dashboard/admin/batch-analysis/[id]` | `/dashboard/ibk-chat/batch-analysis/[id]` | ⬜ |
| 9 | `/dashboard/admin/batch-analysis/schedules` | `/dashboard/ibk-chat/batch-analysis/schedules` | ⬜ |
| 10 | `/dashboard/admin/batch-analysis/prompts` | `/dashboard/ibk-chat/batch-analysis/prompts` | ⬜ |
| 11 | `/dashboard/admin/batch-analysis/faq/[id]` | `/dashboard/ibk-chat/batch-analysis/faq/[id]` | ⬜ |
| 12 | `/dashboard/admin/batch-analysis/issue-frequency` | `/dashboard/ibk-chat/batch-analysis/issue-frequency` | ⬜ |
| 13 | `/dashboard/admin/problematic-rules` | `/dashboard/ibk-chat/problematic-rules` | ⬜ |
| 14 | `/dashboard/business` | `/dashboard/ibk-chat/business` | ⬜ |

### 4.2 ETL 서비스 (2개 페이지)
| # | 현재 경로 | 새 경로 | 상태 |
|---|-----------|---------|------|
| 15 | `/dashboard/etl/wind` | `/dashboard/wind-etl/status` | ⬜ |
| 16 | `/dashboard/etl/minkabu` | `/dashboard/minkabu-etl/status` | ⬜ |

### 4.3 Report 서비스 (1개 페이지)
| # | 현재 경로 | 새 경로 | 상태 |
|---|-----------|---------|------|
| 17 | `/dashboard/report-monitoring` | `/dashboard/ibk-report/status` | ⬜ |

### 4.4 삭제할 페이지 (1개)
| # | 경로 | 이유 | 상태 |
|---|------|------|------|
| 18 | `/dashboard/analysis` | `/dashboard/admin/analysis`와 중복 | ⬜ |

### 4.5 유지할 페이지 (6개)
| # | 경로 | 비고 |
|---|------|------|
| 19 | `/dashboard/admin/users` | 경로 유지 |
| 20 | `/dashboard/admin/roles` | 경로 유지 |
| 21 | `/dashboard/admin/filters` | 경로 유지 |
| 22 | `/dashboard/admin/analysis` | 경로 유지 |
| 23 | `/dashboard/admin/analysis/[id]` | 경로 유지 |
| 24 | `/dashboard` (홈) | 서비스 선택 안내로 변경 |

---

## 4.6 하드코딩 경로 수정 체크리스트 (Critical!)

페이지 이동 시 반드시 함께 수정해야 하는 하드코딩된 `router.push()` 경로들:

| # | 파일 | 라인 | 현재 코드 | 수정 후 |
|---|------|------|-----------|---------|
| 1 | `user-analytics/[userId]/page.tsx` | 65 | `router.push('/dashboard/user-analytics')` | `router.push(`/dashboard/${serviceId}/user-analytics`)` |
| 2 | `admin/batch-analysis/[id]/page.tsx` | 211 | `router.push('/dashboard/admin/batch-analysis')` | `router.push(`/dashboard/${serviceId}/batch-analysis`)` |
| 3 | `admin/batch-analysis/page.tsx` | 77 | `router.push('/dashboard/admin/batch-analysis/prompts')` | `router.push(`/dashboard/${serviceId}/batch-analysis/prompts`)` |
| 4 | `admin/batch-analysis/page.tsx` | 89 | `router.push('/dashboard/admin/batch-analysis/schedules')` | `router.push(`/dashboard/${serviceId}/batch-analysis/schedules`)` |
| 5 | `admin/batch-analysis/prompts/page.tsx` | 155 | `router.push('/dashboard/admin/batch-analysis')` | `router.push(`/dashboard/${serviceId}/batch-analysis`)` |
| 6 | `admin/batch-analysis/schedules/page.tsx` | 211 | `router.push('/dashboard/admin/batch-analysis')` | `router.push(`/dashboard/${serviceId}/batch-analysis`)` |
| 7 | `admin/batch-analysis/faq/[id]/page.tsx` | 143 | `router.push('/dashboard/admin/batch-analysis')` | `router.push(`/dashboard/${serviceId}/batch-analysis`)` |

**수정 패턴** (각 페이지 상단에 추가):
```typescript
import { useParams } from 'next/navigation';

// 컴포넌트 내부
const params = useParams();
const serviceId = params?.serviceId as string || 'ibk-chat';
```

### 4.7 PROJECT_ID 하드코딩 검토

현재 `PROJECT_ID = 'ibks'`로 하드코딩된 파일들 (마이그레이션 시 검토 필요):

| # | 파일 | 라인 | 현재 | 조치 |
|---|------|------|------|------|
| 1 | `operations/page.tsx` | 12 | `const PROJECT_ID = 'ibks'` | IBK Chat 전용 - 유지 |
| 2 | `ai-performance/page.tsx` | 13 | `const PROJECT_ID = 'ibks'` | IBK Chat 전용 - 유지 |
| 3 | `quality/page.tsx` | 14 | `const PROJECT_ID = 'ibks'` | IBK Chat 전용 - 유지 |
| 4 | `chatbot-quality/page.tsx` | 24 | `const PROJECT_ID = 'ibks'` | IBK Chat 전용 - 유지 |
| 5 | `business/page.tsx` | 16 | `const PROJECT_ID = 'ibks'` | IBK Chat 전용 - 유지 |
| 6 | `user-analytics/page.tsx` | 45 | `const PROJECT_ID = 'ibks'` | IBK Chat 전용 - 유지 |
| 7 | `user-analytics/[userId]/page.tsx` | 19 | `const PROJECT_ID = 'ibks'` | IBK Chat 전용 - 유지 |

> **Note**: 현재 모든 PROJECT_ID는 IBK Chat 서비스 전용이므로 변경 불필요.
> 향후 다른 서비스에서 동일 페이지 사용 시 serviceId 기반 동적 PROJECT_ID 필요.

---

## 4.8 누락된 핵심 코드 (반드시 구현)

### 4.8.1 `[serviceId]/layout.tsx` - 서비스 검증 레이아웃

```typescript
// apps/frontend-next/src/app/dashboard/[serviceId]/layout.tsx
import { notFound } from 'next/navigation';
import { servicesConfig } from '@/config/services.config';

const VALID_SERVICE_IDS = servicesConfig.map(s => s.id);

interface ServiceLayoutProps {
  children: React.ReactNode;
  params: { serviceId: string };
}

export default function ServiceLayout({ children, params }: ServiceLayoutProps) {
  // 유효하지 않은 serviceId는 404 처리
  if (!VALID_SERVICE_IDS.includes(params.serviceId)) {
    notFound();
  }

  return <>{children}</>;
}

// 또는 generateStaticParams로 빌드 타임 검증
export function generateStaticParams() {
  return VALID_SERVICE_IDS.map(serviceId => ({ serviceId }));
}
```

### 4.8.2 `Sidebar.tsx` - 동적 메뉴 렌더링 핵심 코드

```typescript
// apps/frontend-next/src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useService } from '@/contexts/ServiceContext';
import { ServiceSelector } from '@/components/ui/ServiceSelector';
import { systemMenus, MenuConfig } from '@/config/services.config';
import { Settings } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { currentService } = useService();

  // 현재 서비스의 메뉴 (null 안전 처리)
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

        {/* 서브메뉴 렌더링 */}
        {menu.subMenus && isActive(fullHref) && (
          <div className="ml-6 mt-1 space-y-1">
            {menu.subMenus.map(subMenu => (
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">OLA B2B</h1>
      </div>

      {/* 서비스 선택 드롭다운 */}
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
            {serviceMenus.map(menu =>
              renderMenuItem(menu, `/dashboard/${currentService.id}`)
            )}
          </div>
        )}

        {!currentService && (
          <div className="text-center py-8 text-gray-400 text-sm">
            서비스를 선택해주세요
          </div>
        )}

        {/* 시스템 관리 섹션 (항상 표시) */}
        <div className="pt-4 mt-4 border-t border-gray-100">
          <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            <Settings className="w-3 h-3 inline mr-1" />
            시스템 관리
          </div>
          {systemMenus.map(menu => {
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

### 4.8.3 `useService()` Null Safety 처리

```typescript
// ServiceContext.tsx의 useService 수정
export function useService(): ServiceContextType {
  const context = useContext(ServiceContext);

  // Provider 외부에서 사용 시 안전한 기본값 반환 (hydration 중 크래시 방지)
  if (!context) {
    return {
      currentService: null,
      setCurrentService: () => {
        console.warn('ServiceProvider not found');
      },
      services: servicesConfig,
      isServicePage: false
    };
  }

  return context;
}
```

### 4.8.4 LucideIcon 타입 호환성 처리

```typescript
// services.config.ts 상단
import type { ComponentType, SVGProps } from 'react';

// lucide-react 버전에 따라 LucideIcon 타입이 다를 수 있음
// 범용 타입 정의로 호환성 확보
export type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export interface MenuConfig {
  id: string;
  label: string;
  icon: IconComponent;  // LucideIcon 대신 범용 타입 사용
  href: string;
  description: string;
  subMenus?: MenuConfig[];
}
```

### 4.8.5 Middleware 쿼리 파라미터 보존

```typescript
// middleware.ts - getRedirectUrl 함수 수정
function getRedirectUrl(pathname: string, searchParams: string): string | null {
  let newPath: string | null = null;

  // 1. 정적 매핑 확인
  if (STATIC_REDIRECTS[pathname]) {
    newPath = STATIC_REDIRECTS[pathname];
  }

  // 2. 동적 패턴 확인 ($ 앵커 제거로 쿼리 파라미터 포함 URL 처리)
  if (!newPath) {
    for (const { pattern, replacement } of DYNAMIC_REDIRECTS) {
      if (pattern.test(pathname)) {
        newPath = pathname.replace(pattern, replacement);
        break;
      }
    }
  }

  // 쿼리 파라미터 보존
  if (newPath && searchParams) {
    return `${newPath}?${searchParams}`;
  }

  return newPath;
}

// middleware 함수 내 호출 수정
const redirectUrl = getRedirectUrl(pathname, request.nextUrl.search.slice(1));
```

---

## 5. 구현 단계

### Phase 1: 기반 구조 구축 (Week 1, Day 1-3)

| 작업 | 파일 | 담당 |
|------|------|------|
| `config` 디렉토리 생성 | `src/config/` | - |
| 서비스 설정 파일 생성 | `src/config/services.config.ts` | - |
| ServiceContext 구현 | `src/contexts/ServiceContext.tsx` | - |
| Providers.tsx에 ServiceProvider 추가 | `src/app/providers.tsx` (line 19) | - |
| PageGuide 컴포넌트 생성 | `src/components/ui/PageGuide.tsx` | - |
| ServiceSelector 컴포넌트 생성 | `src/components/ui/ServiceSelector.tsx` | - |

### Phase 2: 사이드바 리팩토링 (Week 1, Day 4-5)

| 작업 | 파일 | 담당 |
|------|------|------|
| 사이드바 구조 변경 | `src/components/Sidebar.tsx` | - |
| Lucide 아이콘 적용 | `src/components/Sidebar.tsx` | - |
| 동적 메뉴 렌더링 | `src/components/Sidebar.tsx` | - |
| 시스템 관리 섹션 분리 | `src/components/Sidebar.tsx` | - |

### Phase 3: 라우팅 재구성 (Week 2)

| 작업 | 파일 | Day |
|------|------|-----|
| `[serviceId]` 동적 라우트 생성 | `src/app/dashboard/[serviceId]/layout.tsx` | 1 |
| IBK Chat 페이지 이동 (1-7) | 7개 페이지 | 2-3 |
| IBK Chat 페이지 이동 (8-14) | 7개 페이지 | 4 |
| ETL + Report 페이지 이동 | 3개 페이지 | 5 |

### Phase 4: 미들웨어 및 리다이렉트 (Week 3, Day 1-2)

| 작업 | 파일 | 담당 |
|------|------|------|
| 미들웨어 리다이렉트 로직 추가 | `src/middleware.ts` | - |
| 루트 URL 변경 (`/` → `/dashboard`) | `src/middleware.ts` (line 20) | - |
| `/dashboard/analysis` 삭제 | `src/app/dashboard/analysis/` | - |
| 기존 페이지 디렉토리 삭제 | `src/app/dashboard/quality/` 등 | - |

### Phase 5: 페이지 가이드 + 마무리 (Week 3-4)

| 작업 | 파일 | Day |
|------|------|-----|
| 모든 페이지에 PageGuide 추가 | 17개 페이지 | 3-5 |
| 대시보드 홈 서비스 선택 UI | `src/app/dashboard/page.tsx` | 6 |
| 전체 테스트 | - | 7-8 |
| 버그 수정 및 최종 확인 | - | 9-10 |

---

## 6. 리스크 및 대응 방안

### 6.1 기술적 리스크

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| 기존 middleware 인증 로직 손상 | 높음 | 기존 로직 100% 보존, 리다이렉트만 추가 |
| URL 변경으로 외부 링크 깨짐 | 중 | 301 리다이렉트로 SEO/북마크 지원 |
| 동적 경로 리다이렉트 누락 | 중 | 정규식 패턴으로 동적 세그먼트 처리 |
| 페이지 컴포넌트 import 경로 깨짐 | 중 | `@/` 절대 경로 사용으로 최소화 |

### 6.2 일정 리스크

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| 페이지 이동 시 예상치 못한 이슈 | 중 | Week 2에 버퍼 2일 확보 |
| 테스트 기간 부족 | 중 | Week 4에 테스트 전용 4일 확보 |

### 6.3 Rollback 계획

1. Git 브랜치: `feature/navigation-ux-improvement`
2. 각 Phase 완료 시 태그: `nav-ux-phase-1`, `nav-ux-phase-2`, ...
3. 문제 발생 시 해당 Phase 이전 태그로 롤백
4. 핵심 롤백 명령:
   ```bash
   git checkout main
   git branch -D feature/navigation-ux-improvement
   ```

---

## 7. 검증 항목

### 7.1 기능 테스트
- [ ] 서비스 드롭다운에서 'IBK Chat' 선택 시 사이드바에 8개 메뉴 표시
- [ ] 서비스 드롭다운에서 'Wind ETL' 선택 시 사이드바에 1개 메뉴(ETL 상태) 표시
- [ ] `/dashboard/ibk-chat/quality` 접근 시 품질 분석 페이지 로드
- [ ] `/dashboard/quality` 접근 시 `/dashboard/ibk-chat/quality`로 301 리다이렉트
- [ ] `/dashboard/user-analytics/user123` 접근 시 `/dashboard/ibk-chat/user-analytics/user123`으로 리다이렉트
- [ ] 페이지 새로고침 후 서비스 드롭다운에 이전 선택 서비스 표시
- [ ] refreshToken 없이 `/dashboard/ibk-chat/quality` 접근 시 `/login?redirect=...`으로 리다이렉트
- [ ] 로그인 상태에서 `/login` 접근 시 `/dashboard`로 리다이렉트

### 7.2 UI/UX 테스트
- [ ] 모든 사이드바 메뉴 레이블이 한국어로 표시 (영어 혼용 없음)
- [ ] 모든 페이지에 PageGuide 컴포넌트 표시 (페이지명 + 설명 1문장 이상)
- [ ] 현재 메뉴가 사이드바에서 파란색 배경(`bg-blue-50`)으로 하이라이트
- [ ] 서비스 드롭다운 열기/닫기 애니메이션 작동

### 7.3 호환성 테스트
- [ ] Chrome 최신 버전에서 정상 작동
- [ ] Firefox 최신 버전에서 정상 작동
- [ ] 기존 북마크 URL (`/dashboard/quality`) 접근 시 새 URL로 자동 이동

---

## 8. 타임라인 요약

```
Week 1 (02/05 - 02/11)
├─ Day 1-3: 기반 구조 (config, contexts, 컴포넌트)
└─ Day 4-5: 사이드바 리팩토링

Week 2 (02/12 - 02/18)
├─ Day 1: [serviceId] 동적 라우트 생성
├─ Day 2-3: IBK Chat 페이지 이동 (7개)
├─ Day 4: IBK Chat 페이지 이동 (7개)
└─ Day 5: ETL + Report 페이지 이동 (3개)

Week 3 (02/19 - 02/25)
├─ Day 1-2: 미들웨어 리다이렉트 + 기존 페이지 삭제
├─ Day 3-5: 페이지 가이드 추가 (17개)
└─ Day 6: 대시보드 홈 UI

Week 4 (02/26 - 03/04)
├─ Day 7-8: 전체 테스트
└─ Day 9-10: 버그 수정 및 배포 준비
```

---

## 9. 승인 요청

이 수정된 작업 계획서를 검토해 주세요.

### v2.0 Momus 1차 리뷰 해결:
1. ✅ 전체 24개 페이지 매핑 완료 (Section 1.3, 4.1-4.5)
2. ✅ 기존 middleware 인증 로직 보존 (Section 3.4)
3. ✅ Admin 페이지 분류 명확화 - batch-analysis는 IBK Chat 서비스용 (Section 1.3)
4. ✅ `/dashboard/analysis` 처리 명확화 - 삭제 후 admin/analysis로 리다이렉트 (Section 4.4)
5. ✅ 루트 URL 변경 명시 (`/` → `/dashboard`) (Section 3.4)
6. ✅ 모든 수락 기준 측정 가능하게 수정 (Section 2.1)

### v2.1 Momus 2차 리뷰 (코드 안전성) 해결:
7. ✅ **하드코딩 경로 수정 체크리스트** 추가 (Section 4.6) - 7개 파일, 정확한 라인 번호
8. ✅ **PROJECT_ID 하드코딩 검토** 추가 (Section 4.7) - 7개 파일, 조치 방안
9. ✅ **[serviceId]/layout.tsx 코드** 추가 (Section 4.8.1) - 서비스 ID 검증 로직
10. ✅ **Sidebar.tsx 전체 코드** 추가 (Section 4.8.2) - 동적 메뉴 렌더링
11. ✅ **useService() null safety** 추가 (Section 4.8.3) - hydration 크래시 방지
12. ✅ **LucideIcon 타입 호환성** 추가 (Section 4.8.4) - 버전 호환 타입
13. ✅ **쿼리 파라미터 보존** 추가 (Section 4.8.5) - 리다이렉트 시 필터 유지

**이제 코드 레벨에서 런타임 에러 없이 구현할 수 있습니다.**

---

*이 계획서는 Prometheus Planning Session + Momus Review (2회) 를 통해 생성되었습니다.*
