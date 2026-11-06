import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, getToken, setToken } from "./api";
import type { User } from "./types";

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: ApiError | null;
  signIn: (token: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const qc = useQueryClient();

  useEffect(() => {
    const onUnauthorized = () => {
      setTokenState(null);
      qc.clear();
    };
    window.addEventListener("painel:unauthorized", onUnauthorized);
    return () => window.removeEventListener("painel:unauthorized", onUnauthorized);
  }, [qc]);

  const userQuery = useQuery({
    queryKey: ["user", token],
    queryFn: () => api<User>("/api/user"),
    enabled: !!token,
    retry: (count, err) => !(err instanceof ApiError && (err.status === 401 || err.status === 403)) && count < 2,
    staleTime: 5 * 60_000,
  });

  const signIn = useCallback((t: string) => {
    setToken(t);
    setTokenState(t);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api("/api/logout", { method: "POST" });
    } catch {
      /* the token is dropped either way */
    }
    setToken(null);
    setTokenState(null);
    qc.clear();
  }, [qc]);

  const value: AuthState = {
    token,
    user: token ? userQuery.data ?? null : null,
    loading: !!token && userQuery.isLoading,
    error: (userQuery.error as ApiError | null) ?? null,
    signIn,
    signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
