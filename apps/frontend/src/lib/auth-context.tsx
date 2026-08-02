"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "ADMIN" | "STUDENT";

export type AuthUser = {
  id: string;
  universityId: string;
  role: Role;
  email: string;
  name: string;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "hiresphere.auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // One-time hydration from localStorage (an external system, unavailable
    // during SSR) — exactly the case react-hooks/set-state-in-effect's own
    // docs describe as fine to allow: "subscribe for updates from an
    // external system, calling setState in a callback".
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { token: string; user: AuthUser };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToken(parsed.token);
        setUser(parsed.user);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  function login(newToken: string, newUser: AuthUser) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, user: newUser }));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
