"use server";

import {
  AnalysisSession,
  AnalysisMessage,
  CreateSessionRequest,
  SendMessageRequest,
  SendMessageResponse,
  ApiResponse,
  PaginatedResponse,
} from '@ola/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Session Management
export async function fetchSessions(): Promise<AnalysisSession[]> {
  const response = await fetch(`${API_BASE_URL}/api/admin/analysis/sessions`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch sessions');
  const data: ApiResponse<AnalysisSession[]> = await response.json();
  return data.data;
}

export async function createSession(
  request: CreateSessionRequest
): Promise<AnalysisSession> {
  const response = await fetch(`${API_BASE_URL}/api/admin/analysis/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to create session');
  const data: ApiResponse<AnalysisSession> = await response.json();
  return data.data;
}

export async function fetchSessionWithMessages(
  sessionId: string
): Promise<AnalysisSession> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/analysis/sessions/${sessionId}`,
    { cache: 'no-store' }
  );
  if (!response.ok) throw new Error('Failed to fetch session');
  const data: ApiResponse<AnalysisSession> = await response.json();
  return data.data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/analysis/sessions/${sessionId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw new Error('Failed to delete session');
}

// Chat
export async function sendMessage(
  sessionId: string,
  request: SendMessageRequest
): Promise<SendMessageResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/analysis/sessions/${sessionId}/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) throw new Error('Failed to send message');
  const data: ApiResponse<SendMessageResponse> = await response.json();
  return data.data;
}
