import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import { ApiError, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import type { Role, User } from '@/types/api';

const TOKEN_KEY = 'consultapsi.session';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads /api/user (after profile/photo changes). */
  refreshUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    queryClient.clear();
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }, [queryClient]);

  // Restore the saved session on app start
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          setUser(await authApi.me());
        }
      } catch (error) {
        // Only drop the token when the server rejected it (not on network errors)
        if (error instanceof ApiError && error.status === 401) await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const signInWithToken = useCallback(async (token: string) => {
    setAuthToken(token);
    try {
      const me = await authApi.me();
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      setUser(me);
    } catch (error) {
      setAuthToken(null);
      throw error;
    }
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const { user: loggedUser, token } = await authApi.login(username, password);
    setAuthToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setUser(loggedUser);
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout().catch(() => {});
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    setUser(await authApi.me());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signIn,
      signInWithToken,
      signOut,
      refreshUser,
      hasRole: (...roles) => !!user && roles.includes(user.role),
    }),
    [user, isLoading, signIn, signInWithToken, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
