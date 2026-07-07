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
    } finally {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
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

