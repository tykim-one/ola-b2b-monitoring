import { QueryClient } from '@tanstack/react-query';

/**
 * Backend TTL mapping - matches CacheService TTLs
 * SHORT (5분): realtime KPI, anomaly detection
 * MEDIUM (15분): hourly traffic, tenant usage
 * LONG (1시간): static data
 */
export const CACHE_TIME = {
  SHORT: 5 * 60 * 1000,    // 5분
  MEDIUM: 15 * 60 * 1000,  // 15분
  LONG: 60 * 60 * 1000,    // 1시간
} as const;

export type CacheTimeKey = keyof typeof CACHE_TIME;

/**
 * Create a new QueryClient instance
 * Should be called once per app lifecycle
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CACHE_TIME.MEDIUM,
        gcTime: CACHE_TIME.LONG,
        retry: 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

// Singleton for client-side
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}
