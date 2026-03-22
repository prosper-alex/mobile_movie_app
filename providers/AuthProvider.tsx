import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

type AuthUser = {
  name?: string;
  email?: string;
};

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: AuthUser }
  | { status: "unauthenticated"; user: null };

type AuthContextValue = {
  state: AuthState;
  login: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "auth_state_v1";

const AuthContext = createContext<AuthContextValue | null>(null);

const loadAuthUser = async (): Promise<AuthUser | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name : undefined;
    const email = typeof obj.email === "string" ? obj.email : undefined;
    if (!name && !email) return null;
    return { name, email };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await loadAuthUser();
      if (cancelled) return;
      if (user) setState({ status: "authenticated", user });
      else setState({ status: "unauthenticated", user: null });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (user: AuthUser) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setState({ status: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setState({ status: "unauthenticated", user: null });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

