'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { authApi, getAuthToken } from '@/services/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const token = getAuthToken();
    if (token) {
      authApi.verify().then((result) => {
        if (result.success && result.data) {
          setUser({
            id: result.data.user_id,
            email: result.data.email,
            created_at: '',
            files_count: 0,
            total_storage: 0,
          });
        } else {
          authApi.logout();
        }
        setLoading(false);
      });
    } else {
      // Use setTimeout to defer setState outside of the effect
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    if (result.success && result.data?.data) {
      setUser({
        id: result.data.data.user.id,
        email: result.data.data.user.email,
        created_at: '',
        files_count: 0,
        total_storage: 0,
      });
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const register = async (email: string, password: string) => {
    const result = await authApi.register(email, password);
    if (result.success && result.data?.data) {
      setUser({
        id: result.data.data.user.id,
        email: result.data.data.user.email,
        created_at: '',
        files_count: 0,
        total_storage: 0,
      });
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
