"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser, LoginInput, RegisterInput, GoogleAuthResponse, OnboardInput, OnboardResponse } from "@/types";
import { authApi } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<AuthUser>;
  register: (data: RegisterInput) => Promise<{ message: string; user?: AuthUser }>;
  onboard: (data: OnboardInput) => Promise<OnboardResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  googleSignIn: (idToken: string, nonce?: string) => Promise<GoogleAuthResponse>;
  linkGoogleAccount: (idToken: string, password?: string) => Promise<GoogleAuthResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and check current session
  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.user);
    } catch {
      // Try refresh token if access token expired
      try {
        const refreshRes = await authApi.refresh();
        setUser(refreshRes.user);
      } catch {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const initAuth = async () => {
      try {
        const res = await authApi.getMe();
        if (!ignore) setUser(res.user);
      } catch {
        try {
          const refreshRes = await authApi.refresh();
          if (!ignore) setUser(refreshRes.user);
        } catch {
          if (!ignore) setUser(null);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    void initAuth();
    return () => {
      ignore = true;
    };
  }, []);

  const login = async (data: LoginInput): Promise<AuthUser> => {
    const res = await authApi.login(data);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: RegisterInput): Promise<{ message: string; user?: AuthUser }> => {
    const res = await authApi.register(data);
    return { message: res.message, user: res.user };
  };

  const onboard = async (data: OnboardInput): Promise<OnboardResponse> => {
    const res = await authApi.onboard(data);
    if (res.user && user && user.id === res.user.id) {
      setUser(res.user);
    }
    return res;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  const googleSignIn = async (idToken: string, nonce?: string): Promise<GoogleAuthResponse> => {
    const res = await authApi.googleAuth({ idToken, nonce });
    if (res.status === 'ok' && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const linkGoogleAccount = async (idToken: string, password?: string): Promise<GoogleAuthResponse> => {
    const res = await authApi.googleLink({ idToken, password });
    if (res.status === 'ok' && res.user) {
      setUser(res.user);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        onboard,
        logout,
        refreshUser,
        googleSignIn,
        linkGoogleAccount,
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
