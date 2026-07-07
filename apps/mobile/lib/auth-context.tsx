"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { auth, type User } from "./api";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextType = AuthState & {
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await auth.me();
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string): Promise<User> => {
    const { user } = await auth.signin({ username, password });
    setState({
      user,
      isLoading: false,
      isAuthenticated: true,
    });
    return user;
  };

  const logout = async () => {
    try {
      await auth.signout();
      
      // Clear Service Worker caches to prevent stale session restores
      if (typeof window !== "undefined" && "caches" in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map(key => caches.delete(key)));
        } catch (e) {
          console.error("Failed to clear caches:", e);
        }
      }
      
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      // Force a full reload to ensure session is cleared
      window.location.href = "/login";
    } catch (error: any) {
      console.error("Logout failed:", error);
      // We do not reload or clear state if the backend request failed,
      // otherwise the browser retains the cookie and causes an infinite login loop.
      import("sonner").then((mod) => mod.toast.error("Failed to log out: " + (error.message || "Network error")));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

