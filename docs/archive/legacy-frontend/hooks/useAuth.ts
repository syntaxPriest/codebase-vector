"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthMe, AuthProvider, AuthUser } from "@/lib/codebase/types";

export interface UseAuthState {
  user: AuthUser | null;
  providers: AuthProvider[];
  githubAccess: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<UseAuthState>({
    user: null,
    providers: [],
    githubAccess: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setState({ user: null, providers: [], githubAccess: false, loading: false });
        return;
      }
      const data = (await res.json()) as AuthMe;
      setState({
        user: data.user,
        providers: data.providers ?? [],
        githubAccess: !!data.githubAccess,
        loading: false,
      });
    } catch {
      setState({ user: null, providers: [], githubAccess: false, loading: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState((s) => ({ ...s, user: null, githubAccess: false }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as { error?: string }));
      throw new Error(data.error ?? `login failed (${res.status})`);
    }
    await refresh();
  }, [refresh]);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as { error?: string }));
      throw new Error(data.error ?? `signup failed (${res.status})`);
    }
    await refresh();
  }, [refresh]);

  return { ...state, refresh, logout, login, signup };
}
