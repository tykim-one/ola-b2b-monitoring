'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ServiceConfig, ServiceHealthData } from '@ola/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UseServiceHealthOptions {
  serviceId: string;
  config: ServiceConfig;
  refreshInterval?: number; // ms, default 30000 (30 seconds)
  enabled?: boolean; // default true
}

interface UseServiceHealthResult {
  data: ServiceHealthData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface ServiceHealthResponse {
  success: boolean;
  data: ServiceHealthData;
  cached: boolean;
  cacheTTL: string;
}

export function useServiceHealth({
  serviceId,
  config,
  refreshInterval = 30000,
  enabled = true,
}: UseServiceHealthOptions): UseServiceHealthResult {
  const [data, setData] = useState<ServiceHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      // Use custom endpoint if provided, otherwise use default pattern
      const endpoint =
        config.endpoints?.health ||
        `/api/services/${serviceId}/health`;

      // Prepend API base URL for cross-origin requests
      const fullUrl = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
      const response = await fetch(fullUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch health for ${serviceId}: ${response.statusText}`);
      }

      // Backend returns wrapped response: { success, data, cached, cacheTTL }
      const result: ServiceHealthResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(`Invalid response for ${serviceId}`);
      }

      setData(result.data);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error(`[useServiceHealth] Error fetching ${serviceId}:`, errorObj);
    } finally {
      setLoading(false);
    }
  }, [serviceId, config.endpoints?.health, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchHealth();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchHealth, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refresh: fetchHealth,
  };
}
