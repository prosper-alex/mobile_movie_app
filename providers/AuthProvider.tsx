import AsyncStorage from "@react-native-async-storage/async-storage";
import { readStoredItem } from "@/lib/storage";
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
  initializationError: Error | null;
  retryInitialization: () => Promise<void>;
};

const STORAGE_KEY = "auth_state_v1";

const AuthContext = createContext<AuthContextValue | null>(null);

const loadAuthUser = async (): Promise<AuthUser | null> => {
  const raw = await readStoredItem(STORAGE_KEY);
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
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const mounted = React.useRef(true);
  const initializationId = React.useRef(0);

  const retryInitialization = useCallback(async () => {
    const requestId = ++initializationId.current;
    setInitializationError(null);
    setState({ status: "loading", user: null });
    try {
      const user = await loadAuthUser();
      if (!mounted.current || requestId !== initializationId.current) return;
      setState(user ? { status: "authenticated", user } : { status: "unauthenticated", user: null });
    } catch {
      if (mounted.current && requestId === initializationId.current) {
        setInitializationError(new Error("Couldn't read your local profile. Please try again."));
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void retryInitialization();
    return () => {
      mounted.current = false;
    };
  }, [retryInitialization]);

  const login = useCallback(async (user: AuthUser) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setState({ status: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    setState({ status: "unauthenticated", user: null });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.log("Failed to clear auth storage:", err);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ state, login, logout, initializationError, retryInitialization }), [state, login, logout, initializationError, retryInitialization]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
