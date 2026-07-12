'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// === 1. EXISTING INTERFACES & TYPES (UNTOUCHED) ===
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student' | 'faculty';
  avatar?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// === 2. AUTH PROVIDER CORE ===
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ADDED FEATURE: Restore current browser session token link on initial terminal launch
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('handspeak_user_session');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("HandSpeak Secure Storage Link Restoral Failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === 3. EXISTING CORE FUNCTIONS WITH ADDED PERSISTENCE ===
  const login = async (email: string, password?: string): Promise<boolean> => {
  setError(null);

  let authenticatedUser: User | null = null;

  if (email === "admin@handspeak.edu") {
    authenticatedUser = {
      id: "1",
      name: "System Admin",
      email: "admin@handspeak.edu",
      role: "admin",
    };
  }

  if (email === "teacher@handspeak.edu") {
    authenticatedUser = {
      id: "2",
      name: "Teacher Faculty",
      email: "teacher@handspeak.edu",
      role: "teacher",
    };
  }

  if (!authenticatedUser) {
    setError("Invalid credentials.");
    return false;
  }

  localStorage.setItem(
    "handspeak_user_session",
    JSON.stringify(authenticatedUser)
  );

  setUser(authenticatedUser);
  console.log("Logged in user:", authenticatedUser);

  return true;
};

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setUser(null);
      // ADDED FEATURE: Strip access tokens completely from filesystem storage
      localStorage.removeItem('handspeak_user_session');
    } catch (err) {
      console.error("Logout runtime context failure:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    try {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      // ADDED FEATURE: Keep localized synchronization mirrors identical
      localStorage.setItem('handspeak_user_session', JSON.stringify(updatedUser));
      return true;
    } catch (err) {
      setError('Profile update sequence mutation failure.');
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        updateProfile,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// === 4. EXPORT UTILITY CONSUMER ===
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth framework terminal hooks must run strictly inside an AuthProvider wrapper.');
  }
  return context;
}