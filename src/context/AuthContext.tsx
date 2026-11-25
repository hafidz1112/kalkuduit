import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getStoredUser, getStoredToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => void;
}

const TUTORIAL_PENDING_PREFIX = 'kalkuduit_tutorial_pending_';
const TUTORIAL_DONE_PREFIX = 'kalkuduit_tutorial_done_';

export function markTutorialPending(userId: string): void {
  localStorage.setItem(`${TUTORIAL_PENDING_PREFIX}${userId}`, '1');
}

export function isTutorialPending(userId: string): boolean {
  return localStorage.getItem(`${TUTORIAL_PENDING_PREFIX}${userId}`) === '1';
}

export function isTutorialDone(userId: string): boolean {
  return localStorage.getItem(`${TUTORIAL_DONE_PREFIX}${userId}`) === '1';
}

export function markTutorialDone(userId: string): void {
  localStorage.removeItem(`${TUTORIAL_PENDING_PREFIX}${userId}`);
  localStorage.setItem(`${TUTORIAL_DONE_PREFIX}${userId}`, '1');
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const res = await api.me();
          setUser(res.user);
        } catch (err) {
          console.warn('Session expired or invalid, logging out:', err);
          api.logout();
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      setUser(res.user);
      setToken(res.token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.register(name, email, password);
      markTutorialPending(res.user.id);
      setUser(res.user);
      setToken(res.token);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async () => {
    await login('demo@kalkuduit.id', 'password123');
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
