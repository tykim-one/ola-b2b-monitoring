'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserInfo } from '@ola/shared-types';
import { authApi, setAccessToken as setApiAccessToken, setOnAuthError } from '@/lib/api-client';

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Store access token in memory (synced with API client)
  const storeAccessToken = useCallback((token: string) => {
    setApiAccessToken(token);
  }, []);

  const clearAccessToken = useCallback(() => {
    setApiAccessToken(null);
  }, []);

  // Try to refresh tokens on mount to restore session
  useEffect(() => {
    // Register callback for 401 errors from api-client
    // This ensures AuthContext user state is cleared when token refresh fails
    setOnAuthError(() => {
      setUser(null);
      clearAccessToken();
    });

    const initAuth = async () => {
      try {
        // Attempt to refresh tokens (refresh token is in httpOnly cookie)
        const response = await authApi.refresh();
        setUser(response.user);
        storeAccessToken(response.accessToken);
      } catch (error) {
        // No valid session, user needs to login
        setUser(null);
        clearAccessToken();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Cleanup on unmount
    return () => {
      setOnAuthError(null);
    };
  }, [storeAccessToken, clearAccessToken]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      setUser(response.user);
      storeAccessToken(response.accessToken);
    } catch (error) {
      clearAccessToken();
      throw error;
    }
  }, [storeAccessToken, clearAccessToken]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      clearAccessToken();
    }
  }, [clearAccessToken]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;

    // Check if user has the required permission
    return user.permissions.includes(permission);
  }, [user]);

  const value: AuthContextType = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
  }), [user, isLoading, login, logout, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
