import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  UserInfo,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  SavedFilter,
  CreateFilterRequest,
  UpdateFilterRequest,
  AnalysisSession,
  CreateSessionRequest,
  SendMessageRequest,
  SendMessageResponse,
} from '@ola/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store access token in memory
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Request interceptor to attach access token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${API_BASE_URL}/api/admin/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data.accessToken;
        setAccessToken(newAccessToken);

        // Process queued requests
        processQueue();

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear token and reject all queued requests
        processQueue(refreshError);
        setAccessToken(null);

        // Redirect to login if in browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/api/admin/auth/login',
      credentials
    );
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/admin/auth/logout');
    setAccessToken(null);
  },

  async refresh(): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/api/admin/auth/refresh'
    );
    setAccessToken(response.data.accessToken);
    return response.data;
  },
};

// Users API
export const usersApi = {
  async getAll(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/api/admin/users');
    return response.data;
  },

  async getById(id: string): Promise<User> {
    const response = await apiClient.get<User>(`/api/admin/users/${id}`);
    return response.data;
  },

  async create(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<User>('/api/admin/users', data);
    return response.data;
  },

  async update(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.patch<User>(
      `/api/admin/users/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/admin/users/${id}`);
  },
};

// Roles API
export const rolesApi = {
  async getAll(): Promise<Role[]> {
    const response = await apiClient.get<Role[]>('/api/admin/roles');
    return response.data;
  },

  async getById(id: string): Promise<Role> {
    const response = await apiClient.get<Role>(`/api/admin/roles/${id}`);
    return response.data;
  },

  async create(data: CreateRoleRequest): Promise<Role> {
    const response = await apiClient.post<Role>('/api/admin/roles', data);
    return response.data;
  },

  async update(id: string, data: UpdateRoleRequest): Promise<Role> {
    const response = await apiClient.patch<Role>(
      `/api/admin/roles/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/admin/roles/${id}`);
  },
};

// Filters API
export const filtersApi = {
  async getAll(): Promise<SavedFilter[]> {
    const response = await apiClient.get<SavedFilter[]>('/api/admin/filters');
    return response.data;
  },

  async getById(id: string): Promise<SavedFilter> {
    const response = await apiClient.get<SavedFilter>(`/api/admin/filters/${id}`);
    return response.data;
  },

  async create(data: CreateFilterRequest): Promise<SavedFilter> {
    const response = await apiClient.post<SavedFilter>('/api/admin/filters', data);
    return response.data;
  },

  async update(id: string, data: UpdateFilterRequest): Promise<SavedFilter> {
    const response = await apiClient.patch<SavedFilter>(
      `/api/admin/filters/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/admin/filters/${id}`);
  },

  async setDefault(id: string): Promise<SavedFilter> {
    const response = await apiClient.post<SavedFilter>(
      `/api/admin/filters/${id}/set-default`
    );
    return response.data;
  },
};

// Analysis API
export const analysisApi = {
  async createSession(
    data: CreateSessionRequest
  ): Promise<AnalysisSession> {
    const response = await apiClient.post<AnalysisSession>(
      '/api/admin/analysis/sessions',
      data
    );
    return response.data;
  },

  async getSessions(): Promise<AnalysisSession[]> {
    const response = await apiClient.get<AnalysisSession[]>(
      '/api/admin/analysis/sessions'
    );
    return response.data;
  },

  async getSession(sessionId: string): Promise<AnalysisSession> {
    const response = await apiClient.get<AnalysisSession>(
      `/api/admin/analysis/sessions/${sessionId}`
    );
    return response.data;
  },

  async sendMessage(
    sessionId: string,
    data: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>(
      `/api/admin/analysis/sessions/${sessionId}/messages`,
      data
    );
    return response.data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/api/admin/analysis/sessions/${sessionId}`);
  },
};

export default apiClient;
