import {
  UserRequestCount,
  UserTokenUsage,
  UserQuestionPattern,
  UserListItem,
  UserActivityDetail,
} from '@ola/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.42:3000';

interface ApiResponse<T> {
  success: boolean;
  count: number;
  data: T;
  cached: boolean;
  cacheTTL: string;
}

/**
 * Fetch user request counts (by x_enc_data)
 */
export async function fetchUserRequestCounts(
  projectId: string,
  days: number = 7,
  limit: number = 1000
): Promise<UserRequestCount[]> {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/api/analytics/user-requests?days=${days}&limit=${limit}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user request counts');
  }

  const data: ApiResponse<UserRequestCount[]> = await response.json();
  return data.data;
}

/**
 * Fetch user token usage (by x_enc_data)
 */
export async function fetchUserTokenUsage(
  projectId: string,
  days: number = 7,
  limit: number = 1000
): Promise<UserTokenUsage[]> {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/api/analytics/user-tokens?days=${days}&limit=${limit}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user token usage');
  }

  const data: ApiResponse<UserTokenUsage[]> = await response.json();
  return data.data;
}

/**
 * Fetch user question patterns (by x_enc_data)
 */
export async function fetchUserQuestionPatterns(
  projectId: string,
  userId?: string,
  limit: number = 100
): Promise<UserQuestionPattern[]> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  params.append('limit', limit.toString());

  const response = await fetch(
    `${API_BASE}/projects/${projectId}/api/analytics/user-patterns?${params}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user question patterns');
  }

  const data: ApiResponse<UserQuestionPattern[]> = await response.json();
  return data.data;
}

/**
 * Fetch user list with aggregated statistics
 */
export async function fetchUserList(
  projectId: string,
  days: number = 7,
  limit: number = 1000
): Promise<UserListItem[]> {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/api/analytics/user-list?days=${days}&limit=${limit}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user list');
  }

  const data: ApiResponse<UserListItem[]> = await response.json();
  return data.data;
}

/**
 * Fetch user activity details (conversation history)
 */
export async function fetchUserActivity(
  projectId: string,
  userId: string,
  days: number = 7,
  limit: number = 20,
  offset: number = 0
): Promise<UserActivityDetail[]> {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/api/analytics/user-activity/${encodeURIComponent(userId)}?days=${days}&limit=${limit}&offset=${offset}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user activity');
  }

  const data: ApiResponse<UserActivityDetail[]> = await response.json();
  return data.data;
}
